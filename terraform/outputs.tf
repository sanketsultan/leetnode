output "public_ip" {
  description = "Elastic IP — add this as an A record for your domain"
  value       = aws_eip.leetnode.public_ip
}

output "ssh_command" {
  description = "SSH into the server"
  value       = "ssh ubuntu@${aws_eip.leetnode.public_ip}"
}

output "site_url" {
  description = "Your live site"
  value       = "https://${var.domain}"
}
