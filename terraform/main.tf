terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ── Remote state (uncomment after creating the S3 bucket + DynamoDB table) ──
  # Run once manually:
  #   aws s3 mb s3://leetnode-tfstate
  #   aws dynamodb create-table --table-name leetnode-tflock \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST
  #
  # backend "s3" {
  #   bucket         = "leetnode-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "leetnode-tflock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

# ── Latest Ubuntu 24.04 AMI ──────────────────────────────────────────────────

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

# ── VPC + networking (self-contained, no default VPC needed) ─────────────────

resource "aws_vpc" "leetnode" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "leetnode-vpc" }
}

resource "aws_subnet" "leetnode" {
  vpc_id                  = aws_vpc.leetnode.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags = { Name = "leetnode-subnet" }
}

resource "aws_internet_gateway" "leetnode" {
  vpc_id = aws_vpc.leetnode.id
  tags   = { Name = "leetnode-igw" }
}

resource "aws_route_table" "leetnode" {
  vpc_id = aws_vpc.leetnode.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.leetnode.id
  }

  tags = { Name = "leetnode-rt" }
}

resource "aws_route_table_association" "leetnode" {
  subnet_id      = aws_subnet.leetnode.id
  route_table_id = aws_route_table.leetnode.id
}

# ── SSH key pair ─────────────────────────────────────────────────────────────

resource "aws_key_pair" "leetnode" {
  key_name   = "leetnode-key"
  public_key = file(var.public_key_path)
}

# ── Security group ───────────────────────────────────────────────────────────

resource "aws_security_group" "leetnode" {
  name        = "leetnode-sg"
  description = "LeetNode: allow SSH, HTTP, HTTPS"
  vpc_id      = aws_vpc.leetnode.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "leetnode-sg" }
}

# ── EC2 instance ─────────────────────────────────────────────────────────────

resource "aws_instance" "leetnode" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.leetnode.key_name
  subnet_id              = aws_subnet.leetnode.id
  vpc_security_group_ids = [aws_security_group.leetnode.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    github_repo        = var.github_repo
    domain             = var.domain
    alert_email        = var.alert_email
    dockerhub_username = var.dockerhub_username
    github_pat         = var.github_pat
  })

  tags = { Name = "leetnode" }

  lifecycle {
    create_before_destroy = true
  }
}

# ── Elastic IP (static public IP) ────────────────────────────────────────────

resource "aws_eip" "leetnode" {
  instance = aws_instance.leetnode.id
  domain   = "vpc"
  tags     = { Name = "leetnode-eip" }
}
