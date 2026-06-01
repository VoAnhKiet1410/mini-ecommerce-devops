terraform {
  backend "s3" {
    bucket         = "YOUR_ORG-mini-ecommerce-tfstate-UNIQUE"
    key            = "aws/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "mini-ecommerce-devops-tflock"
    encrypt        = true
  }
}
