# Base image
FROM node:20

# Set working directory inside container
WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy application source code into container
COPY . .

# Expose API service port
EXPOSE 3000

# Command to start the REST API service
CMD ["npm", "start"]
