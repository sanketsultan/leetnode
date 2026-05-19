variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. t2.micro is free tier (1GB RAM, ~1-2 users). t3.medium recommended (4GB RAM, ~10 users)."
  type        = string
  default     = "t3.medium"
}

variable "domain" {
  description = "Your domain name (e.g. leetnode.io)"
  type        = string
  default     = "leetnode.io"
}

variable "github_repo" {
  description = "HTTPS URL of your GitHub repo"
  type        = string
  default     = "https://github.com/sanketsultan/leetnode.git"
}

variable "public_key_path" {
  description = "Path to your SSH public key — used to access the EC2 instance"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "alert_email" {
  description = "Email for SSL cert renewal alerts"
  type        = string
  default     = "admin@leetnode.io"
}

variable "dockerhub_username" {
  description = "Docker Hub username — images are pulled from here on bootstrap"
  type        = string
  default     = ""
}

variable "github_pat" {
  description = "GitHub Personal Access Token (read:repo) for cloning private repo on bootstrap"
  type        = string
  default     = ""
  sensitive   = true
}
