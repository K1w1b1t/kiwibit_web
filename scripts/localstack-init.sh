#!/bin/sh
set -eu

bucket="${LOCALSTACK_S3_BUCKET:-kiwibit-local}"

if ! awslocal s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
  awslocal s3api create-bucket --bucket "$bucket"
fi

awslocal s3api put-bucket-policy \
  --bucket "$bucket" \
  --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":[\"s3:GetObject\"],\"Resource\":\"arn:aws:s3:::$bucket/*\"}]}"
