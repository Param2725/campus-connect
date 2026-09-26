# Base image
FROM node:20

# Set working directory inside container
WORKDIR /app

# Copy dependency definition files from student-api
COPY student-api/package*.json ./

# Install application dependencies
RUN npm install

# Copy backend application source code into container
COPY student-api/ ./

# Expose API service port
EXPOSE 3000

# Command to start the REST API service
CMD ["npm", "start"]
