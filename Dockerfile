# 1. Start with Node 20 Alpine
FROM node:20-alpine

# 2. Install PowerShell
# Alpine's repository contains powershell, usually pulled via apk
RUN apk add --no-cache powershell

# 3. Install PM2 globally
RUN npm install -g pm2

# 4. Set Workspace and Copy
WORKDIR /app
COPY . .

# 5. Install app dependencies
RUN npm install

# 6. Default to PowerShell for runtime control
CMD ["pwsh"]