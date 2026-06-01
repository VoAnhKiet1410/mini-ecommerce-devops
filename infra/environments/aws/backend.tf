terraform {
  backend "s3" {
    key            = "aws/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "mini-ecommerce-devops-tflock"
    encrypt        = true
  }
}
