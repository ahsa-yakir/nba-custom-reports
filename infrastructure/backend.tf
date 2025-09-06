terraform {
  backend "s3" {
    bucket         = "nba-analytics-tofu-state"
    key            = "terraform/state"
    region         = "us-east-2"
    dynamodb_table = "nba-analytics-tofu-locks"
    encrypt        = true
  }
}