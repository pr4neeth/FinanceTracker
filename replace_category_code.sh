#!/bin/bash

# Backup the original file
cp server/mongo-routes.ts server/mongo-routes.ts.bak

# Replace the first occurrence (lines 701-714)
sed -i '701,714s/.*/ \/\/ Try to find a matching category using config-based helper\n          let categoryId = categorizePlaidTransactionWithConfig(transaction);/' server/mongo-routes.ts
