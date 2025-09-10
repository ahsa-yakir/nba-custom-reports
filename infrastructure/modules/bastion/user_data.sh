#!/bin/bash
# infrastructure/modules/bastion/user_data.sh

# Update system
yum update -y

# Install PostgreSQL client for testing
yum install -y postgresql15

# Install other useful tools
yum install -y htop nano telnet

# Create a test script for RDS connectivity
cat > /home/ec2-user/test_rds.sh << 'EOF'
#!/bin/bash
echo "Testing RDS connectivity..."
echo "RDS Endpoint: ${rds_endpoint}"
echo "Testing port 5432..."

timeout 5 bash -c "</dev/tcp/${rds_endpoint}/5432" && echo "✅ RDS port 5432 is reachable" || echo "❌ RDS port 5432 is NOT reachable"

echo ""
echo "To test PostgreSQL connection:"
echo "psql -h ${rds_endpoint} -p 5432 -U postgres -d nba_analytics"
EOF

chmod +x /home/ec2-user/test_rds.sh
chown ec2-user:ec2-user /home/ec2-user/test_rds.sh

# Create ready indicator
echo "Bastion host setup complete" > /tmp/bastion_ready
echo "$(date): Bastion host ready" >> /var/log/bastion_setup.log