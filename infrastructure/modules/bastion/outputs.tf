# infrastructure/modules/bastion/outputs.tf

output "bastion_public_ip" {
  description = "Public IP address of the bastion host"
  value       = aws_instance.bastion.public_ip
}

output "bastion_instance_id" {
  description = "Instance ID of the bastion host"
  value       = aws_instance.bastion.id
}

output "ssh_command" {
  description = "SSH command to create tunnel to RDS"
  value       = local.ssh_command
}

output "key_pair_name" {
  description = "Name of the SSH key pair"
  value       = aws_key_pair.bastion.key_name
}

output "connection_instructions" {
  description = "Instructions for connecting to RDS through bastion"
  value = <<-EOT
    1. Save your private key as ${aws_key_pair.bastion.key_name}.pem and set permissions:
       chmod 600 ${aws_key_pair.bastion.key_name}.pem
    
    2. Create SSH tunnel to RDS:
       ${local.ssh_command}
    
    3. Update your .env file to use localhost:
       DB_HOST=localhost
       DB_PORT=5432
    
    4. Run your NBA pipeline:
       python nba_pipeline.py setup
    
    5. When done, press Ctrl+C to close tunnel and run:
       tofu destroy -target=module.bastion
  EOT
}