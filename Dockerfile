# Use the official lightweight Node.js 20 image based on Alpine
FROM node:20-alpine

# Install tzdata package (required for timezone support in alpine images)
RUN apk add --no-cache tzdata

# Set the timezone to Nepal (Asia/Kathmandu)
ENV TZ=Asia/Kathmandu

# Make timezone symlink and write timezone name (makes it fully consistent)
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Set working directory
WORKDIR /app

# Copy package files first (optimizes caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 3001

# Start the server in development mode
CMD ["npm", "run", "dev"]