# CI/CD Pipeline: Deploying a Node.js Application on AWS EC2

A complete CI/CD implementation that automates the build and deployment of a Node.js, TypeScript, and Express application to an AWS EC2 Ubuntu server using **GitHub Actions, PM2, and Nginx**.

---

## 1. Project Overview

The objective of this project is to implement a Continuous Integration and Continuous Deployment (CI/CD) pipeline that automatically deploys a Node.js backend application to an AWS EC2 instance whenever new code is pushed to the GitHub repository.

Instead of manually connecting to the EC2 instance, pulling code, installing dependencies, building the application, and restarting the server after every update, GitHub Actions automates the deployment process.

### Key objectives

- Automate application builds using GitHub Actions.
- Deploy the application to an AWS EC2 Ubuntu instance.
- Use SSH and SCP for secure remote access and file transfer.
- Compile TypeScript code into JavaScript.
- Use PM2 to manage and maintain the Node.js application process.
- Configure Nginx as a reverse proxy.
- Perform application health checks after deployment.
- Support rollback in case of deployment failure.

## 2. Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| TypeScript | Application development |
| Express.js | Backend framework |
| GitHub | Source code management |
| GitHub Actions | CI/CD automation |
| AWS EC2 | Cloud hosting |
| Ubuntu | EC2 operating system |
| SSH | Secure remote server connection |
| SCP | Secure file transfer |
| PM2 | Node.js process management |
| Nginx | Reverse proxy |
| npm | Dependency management |

## 3. Architecture

The deployment pipeline follows this sequence:

```text
              Developer
                  |
                  |
            Push code to GitHub
                  |
                  v
          GitHub Repository
                  |
                  v
           GitHub Actions
                  |
          +-------+--------+
          |                |
          v                v
     Build Application   Install Dependencies
          |
          v
     TypeScript Build
          |
          v
     Generate dist/
          |
          v
     Package Application
          |
          v
       Build Artifact
          |
          v
       Deploy Job
          |
          v
       SSH / SCP
          |
          v
       AWS EC2
          |
          v
     Extract Application
          |
          v
       PM2 Process Manager
          |
          v
      Node.js Application
        Port 8000
          |
          v
         Nginx
        Port 80
          |
          v
       User Browser
```

### Deployment flow

1. A developer pushes code to the GitHub repository.
2. GitHub Actions automatically triggers the workflow.
3. The build job installs dependencies and compiles the TypeScript application.
4. The generated application files are packaged into an artifact.
5. The deployment job transfers the artifact to EC2 using SCP.
6. SSH executes deployment commands on the EC2 server.
7. PM2 starts or reloads the Node.js application.
8. Nginx forwards incoming HTTP requests to the backend running on port 8000.
9. A health check verifies that the application is responding.

## 4. Project Structure

The application uses a root-level Node.js project structure.

```text
CI-CD/
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── src/
│   └── index.ts
│
├── dist/
│   └── index.js
│
├── node_modules/
│
├── ecosystem.config.cjs
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

### Explanation

| File / Directory | Description |
|---|---|
| `.github/workflows/` | Contains GitHub Actions workflow files |
| `deploy.yml` | Defines the CI/CD pipeline |
| `src/` | Contains TypeScript source code |
| `dist/` | Contains compiled JavaScript files |
| `ecosystem.config.cjs` | PM2 application configuration |
| `package.json` | Project metadata, dependencies, and scripts |
| `package-lock.json` | Locks dependency versions |
| `tsconfig.json` | TypeScript compiler configuration |

**Important:** The `dist/` directory is generated during the build process. It does not need to be committed to Git if the CI pipeline generates it.

---

# PART 1: AWS EC2 SERVER CONFIGURATION

## 5. Launch an EC2 Instance

An AWS EC2 instance provides the virtual machine on which the Node.js backend runs.

### Steps

1. Log in to the AWS Management Console.
2. Navigate to EC2.
3. Select Launch Instance.
4. Choose Ubuntu Server as the operating system.
5. Select an appropriate instance type.
6. Create or select an SSH key pair.
7. Configure the network and security settings.
8. Launch the instance.

### Security Group Configuration

The EC2 Security Group controls incoming network traffic.

Configure the following inbound rules:

| Type | Port | Source | Purpose |
|---|---:|---|---|
| SSH | 22 | Your IP | Remote server access |
| HTTP | 80 | 0.0.0.0/0 | Public HTTP traffic |
| HTTPS | 443 | 0.0.0.0/0 | HTTPS traffic, if configured |

SSH should be restricted to trusted IP addresses rather than exposed to everyone.

## 6. Connect to EC2 Using SSH

Download the EC2 private key and connect to the instance.

First, set the appropriate key permissions:

```bash
chmod 400 your-key.pem
```

Connect:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

**Explanation:**

- `ssh` establishes a secure remote connection.
- `-i` specifies the private key.
- `ubuntu` is the default Ubuntu EC2 username.
- `YOUR_EC2_PUBLIC_IP` is the public IP of your instance.

After successful authentication, you get access to the EC2 terminal.

## 7. Update Ubuntu Packages

Update the package repository:

```bash
sudo apt update
```

Upgrade installed packages:

```bash
sudo apt upgrade -y
```

Install useful utilities:

```bash
sudo apt install -y curl git unzip
```

This ensures the server has updated package information and the utilities required for deployment.

## 8. Install Node.js and npm

The application uses Node.js and npm.

Install Node.js using the NodeSource repository, selecting the same major version used by the build environment.

For example, to install Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

```bash
sudo apt install -y nodejs
```

Verify installation:

```bash
node -v
npm -v
```

The Node.js version used in the CI build and EC2 runtime should be compatible.

## 9. Install PM2

PM2 is a process manager for Node.js applications.

Install it globally:

```bash
sudo npm install -g pm2
```

Verify:

```bash
pm2 -v
```

### Why PM2?

Normally, if a Node.js application is started using:

```bash
node dist/index.js
```

the application runs in the foreground. Closing the terminal or terminating the process stops it.

PM2 manages the application in the background.

It provides:

- Process monitoring.
- Automatic restart after crashes.
- Application logs.
- Cluster mode.
- Process management.
- Startup integration.

## 10. Install Nginx

Install Nginx:

```bash
sudo apt install -y nginx
```

Start Nginx:

```bash
sudo systemctl start nginx
```

Enable it at system startup:

```bash
sudo systemctl enable nginx
```

Check its status:

```bash
sudo systemctl status nginx
```

Nginx will listen on port 80 and forward requests to the Node.js application running on port 8000.

---

# PART 2: APPLICATION CONFIGURATION

## 11. Create the Application Directory

Create a directory to store the backend application:

```bash
sudo mkdir -p /var/www/express-app
```

Assign ownership to the Ubuntu user:

```bash
sudo chown -R ubuntu:ubuntu /var/www/express-app
```

Move into the directory:

```bash
cd /var/www/express-app
```

### Why `/var/www/express-app`?

`/var/www/` is a conventional location for website and application files on Linux servers.

We use a dedicated directory to keep the application separate from system files.

### Important: File permissions

During deployment, an `EACCES: permission denied` error occurred because some project files were owned by root while commands were being executed as ubuntu.

The ownership was corrected using:

```bash
sudo chown -R ubuntu:ubuntu /var/www/express-app
```

This allows the Ubuntu user to create and modify application files.

Avoid switching between root PM2 and Ubuntu PM2. Keep application management consistent under the `ubuntu` user.

## 12. Install Application Dependencies

Inside the application directory:

```bash
npm install
```

For a reproducible production installation when the lockfile is available:

```bash
npm ci --omit=dev
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`.

The `--omit=dev` option excludes development-only dependencies.

The production deployment must contain the dependencies required by the compiled application.

## 13. Build the TypeScript Application

The application uses TypeScript.

TypeScript source files inside `src/` must be compiled into JavaScript before Node.js can execute them.

Run:

```bash
npm run build
```

The build script executes the TypeScript compiler:

```bash
tsc
```

The compiler generates the JavaScript output inside `dist/`.

Expected structure:

```text
express-app/
│
├── src/
│   └── index.ts
│
├── dist/
│   └── index.js
│
├── package.json
└── tsconfig.json
```

Verify:

```bash
ls -la dist
```

The PM2 configuration expects this compiled entry point:

```text
/var/www/express-app/dist/index.js
```

**Important:** If `dist/index.js` does not exist, PM2 will report:

```text
Error: Script not found:
 /var/www/express-app/dist/index.js
```

This means the application must be built successfully before PM2 can start it.

## 14. Configure PM2 Using ecosystem.config.cjs

Instead of manually starting the application, we use a PM2 ecosystem configuration file.

Create:

```bash
nano ecosystem.config.cjs
```

Example configuration matching the deployed application:

```javascript
module.exports = {
  apps: [
    {
      name: "express-app",
      script: "dist/index.js",

      cwd: "/var/www/express-app",

      instances: 2,
      exec_mode: "cluster",

      autorestart: true,
      watch: false,

      max_memory_restart: "500M",

      env: {
        NODE_ENV: "production",
        PORT: 8000
      }
    }
  ]
};
```

### Explanation

| Property | Purpose |
|---|---|
| `name` | Identifies the application in PM2 |
| `script` | Specifies the compiled JavaScript entry point |
| `cwd` | Sets the working directory |
| `instances` | Starts two application instances |
| `exec_mode` | Runs the application in cluster mode |
| `autorestart` | Restarts the application if it crashes |
| `watch` | Controls automatic restart on file changes |
| `max_memory_restart` | Restarts the process if memory exceeds the configured limit |
| `NODE_ENV` | Sets the environment to production |
| `PORT` | Configures the application to use port 8000 |

The two PM2 instances were visible in the deployed server's process list.

### Start the application

```bash
pm2 start ecosystem.config.cjs
```

Check the process list:

```bash
pm2 list
```

View logs:

```bash
pm2 logs express-app
```

Save the process list:

```bash
pm2 save
```

Configure PM2 to start on system reboot:

```bash
pm2 startup
```

Run the additional command printed by PM2. Then save the process list again:

```bash
pm2 save
```

### Verify the backend

Run:

```bash
curl -i http://localhost:8000
```

Expected response from the deployed Express application:

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8

It's working
```

This confirms that the Node.js backend is responding successfully on port 8000.

---

# PART 3: NGINX CONFIGURATION

## 15. Understanding Nginx as a Reverse Proxy

Nginx acts as an intermediary between the user and the Node.js backend.

Without Nginx, users would need to access the application using:

```text
http://EC2_PUBLIC_IP:8000
```

With Nginx configured as a reverse proxy, users can access:

```text
http://EC2_PUBLIC_IP
```

Nginx receives the request on port 80 and forwards it internally to the backend on port 8000.

### Request flow

```text
User Browser
     |
     | HTTP Request
     v
EC2 Public IP :80
     |
     v
   Nginx
     |
     | Proxy Request
     v
localhost:8000
     |
     v
Express Application
     |
     v
HTTP Response
     |
     v
User Browser
```

## 16. Create an Nginx Configuration File

Ubuntu organizes Nginx virtual-host configurations into two directories:

```text
/etc/nginx/
│
├── sites-available/
│
└── sites-enabled/
```

### sites-available

Stores configuration files for websites and applications.

### sites-enabled

Contains symbolic links to the configurations that Nginx should actively load.

Create the application configuration:

```bash
sudo nano /etc/nginx/sites-available/myapp
```

Add:

```nginx
server {
    listen 80;

    server_name _;

    location / {
        proxy_pass http://localhost:8000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Configuration explanation

| Directive | Purpose |
|---|---|
| `listen 80` | Makes Nginx listen on HTTP port 80 |
| `server_name _` | Acts as a catch-all server name |
| `location /` | Matches requests to the root path and other paths |
| `proxy_pass` | Forwards requests to the Express backend |
| `proxy_http_version` | Uses HTTP/1.1 for the upstream connection |
| `proxy_set_header Host` | Preserves the original host header |
| `proxy_set_header X-Real-IP` | Passes the client's IP address |
| `X-Forwarded-For` | Preserves the proxy chain's client IP information |
| `X-Forwarded-Proto` | Passes the original request protocol |

## 17. Create a Symbolic Link

The configuration file currently exists inside:

```text
/etc/nginx/sites-available/myapp
```

However, Ubuntu's standard Nginx configuration loads enabled site configurations from:

```text
/etc/nginx/sites-enabled/
```

We therefore create a symbolic link.

Run:

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
```

### What is a symbolic link?

A symbolic link is similar to a shortcut in Windows.

It points to the original file instead of creating another copy.

After creating the link:

```text
sites-available/
    |
    └── myapp
        Original configuration file


sites-enabled/
    |
    └── myapp
        Symbolic link to the original file
```

### Why do we create it?

- It enables the application-specific Nginx configuration.
- It avoids duplicating configuration files.
- It allows configurations to be enabled or disabled independently.
- It makes managing multiple websites easier.

To disable the application configuration without deleting the original:

```bash
sudo rm /etc/nginx/sites-enabled/myapp
```

## 18. Disable the Default Nginx Website

Ubuntu may have a default Nginx website enabled.

Remove its enabled link:

```bash
sudo rm /etc/nginx/sites-enabled/default
```

This prevents the default website configuration from taking precedence in situations where it matches the incoming request.

The original configuration inside `sites-available` is not deleted.

## 19. Test and Reload Nginx

Before applying the configuration, test it:

```bash
sudo nginx -t
```

Expected output:

```text
syntax is ok
test is successful
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

Check status:

```bash
sudo systemctl status nginx
```

Test the reverse proxy locally:

```bash
curl -i http://localhost
```

Expected result:

```http
HTTP/1.1 200 OK

It's working
```

This confirms that Nginx can forward requests to the Node.js application.

---

# PART 4: GITHUB ACTIONS CI/CD PIPELINE

## 20. What Is GitHub Actions?

GitHub Actions is an automation platform provided by GitHub.

It allows developers to automate tasks such as:

- Installing dependencies.
- Running tests.
- Building applications.
- Packaging application files.
- Deploying applications to remote servers.

In this project, GitHub Actions automates the deployment of the Express backend to AWS EC2.

## 21. Create the GitHub Actions Workflow

Inside the project repository, create:

```text
.github/workflows/deploy.yml
```

This YAML file defines the CI/CD pipeline.

The workflow consists of two major jobs:

1. Build Application
2. Deploy to EC2

### Job 1: Build Application

The build job performs the following operations:

1. Checks out the GitHub repository.
2. Sets up Node.js.
3. Installs project dependencies.
4. Compiles TypeScript.
5. Packages the generated application files.
6. Uploads the deployment artifact.

### Job 2: Deploy to EC2

The deployment job:

1. Downloads the artifact generated by the build job.
2. Configures SSH access.
3. Transfers the artifact to EC2 using SCP.
4. Connects to EC2 using SSH.
5. Extracts the application files.
6. Installs production dependencies if required.
7. Starts or reloads the application through PM2.
8. Performs a health check.
9. Uses the backup/rollback mechanism if deployment fails.

### Workflow trigger

The pipeline is configured to run when code is pushed to the `main` branch. A manual workflow trigger can also be enabled.

Example trigger:

```yaml
on:
  push:
    branches:
      - main

  workflow_dispatch:
```

### Example workflow structure

The following is a reference implementation of the two-job workflow. Adapt its commands and artifact contents to match the exact deployment workflow in your repository.

```yaml
name: Deploy to EC2

on:
  push:
    branches:
      - main

  workflow_dispatch:

jobs:

  build:
    name: Build Application
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Package Application
        run: |
          tar -czf deploy.tar.gz \
            dist \
            package.json \
            package-lock.json \
            ecosystem.config.cjs

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: application-build
          path: deploy.tar.gz

  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Download Artifact
        uses: actions/download-artifact@v4
        with:
          name: application-build

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/ec2_key
          chmod 600 ~/.ssh/ec2_key

      - name: Transfer Artifact to EC2
        run: |
          scp -i ~/.ssh/ec2_key \
            -o StrictHostKeyChecking=no \
            deploy.tar.gz \
            ${{ secrets.EC2_USERNAME }}@${{ secrets.EC2_HOST }}:/tmp/deploy.tar.gz

      - name: Deploy Application
        run: |
          ssh -i ~/.ssh/ec2_key \
            -o StrictHostKeyChecking=no \
            ${{ secrets.EC2_USERNAME }}@${{ secrets.EC2_HOST }} << 'EOF'

            set -e

            cd /var/www/express-app

            if [ -f package.json ]; then
              tar -czf /tmp/express-app-backup.tar.gz \
                dist package.json package-lock.json ecosystem.config.cjs
            fi

            tar -xzf /tmp/deploy.tar.gz -C /var/www/express-app

            npm ci --omit=dev

            pm2 reload ecosystem.config.cjs --update-env || \
              pm2 start ecosystem.config.cjs

            sleep 5

            curl --fail http://localhost:8000

            EOF
```

**Important:** This YAML is an illustrative reference, not a verified copy of your exact original `deploy.yml`. In particular, the example uses `StrictHostKeyChecking=no` for simplicity, which should be replaced with verified SSH host-key checking in a production pipeline. Also, a complete rollback should restore the previous release and reload PM2; merely creating a backup does not implement rollback automatically.

---

## 22. Configure GitHub Repository Secrets

The GitHub Actions workflow needs credentials to connect to the EC2 instance.

Never hardcode private keys or server credentials directly in the workflow file.

Navigate to:

```text
GitHub Repository
       |
       v
Settings
       |
       v
Secrets and variables
       |
       v
Actions
       |
       v
New repository secret
```

Configure the following secrets:

| Secret | Description |
|---|---|
| `EC2_HOST` | Public IP or public DNS of EC2 |
| `EC2_USERNAME` | EC2 SSH username, usually `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key used for authentication |

### EC2_HOST

Example:

```text
YOUR_EC2_PUBLIC_IP
```

### EC2_USERNAME

```text
ubuntu
```

### EC2_SSH_KEY

Paste the complete private key contents, including the BEGIN and END lines.

Example format:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
PRIVATE_KEY_CONTENT
-----END OPENSSH PRIVATE KEY-----
```

Keep these secrets private.

For stronger SSH security, configure a verified known-hosts entry rather than disabling host-key checking.

## 23. How the Build Job Works

### Checkout repository

```yaml
uses: actions/checkout@v4
```

Downloads the source code from GitHub into the GitHub Actions runner.

### Setup Node.js

```yaml
uses: actions/setup-node@v4
```

Configures Node.js in the runner.

### Install dependencies

```bash
npm ci
```

Installs dependencies using the lockfile.

### Build application

```bash
npm run build
```

Compiles the TypeScript source code.

### Package application

```bash
tar -czf deploy.tar.gz ...
```

Creates a compressed archive containing the files needed for deployment.

### Upload artifact

```yaml
uses: actions/upload-artifact@v4
```

Stores the generated archive so that the deployment job can download it.

## 24. How the Deployment Job Works

### Download artifact

```yaml
uses: actions/download-artifact@v4
```

Retrieves the artifact produced by the build job.

### SSH configuration

The private SSH key is written to a file and given restricted permissions.

### SCP file transfer

```bash
scp deploy.tar.gz ubuntu@EC2_HOST:/tmp/
```

SCP securely transfers the compressed deployment package to EC2.

### SSH remote execution

```bash
ssh ubuntu@EC2_HOST
```

Establishes a secure remote connection and executes deployment commands.

### Extract application

```bash
tar -xzf /tmp/deploy.tar.gz -C /var/www/express-app
```

Extracts the application files into the deployment directory.

### Install production dependencies

```bash
npm ci --omit=dev
```

Installs the dependencies required to run the production application.

### Reload PM2

```bash
pm2 reload ecosystem.config.cjs --update-env
```

Reloads the application using the updated configuration and environment.

If the application has not been started before, PM2 must start it instead.

### Health check

```bash
curl --fail http://localhost:8000
```

Checks whether the backend responds successfully.

The `--fail` option makes curl return a failure status for HTTP error responses.

---

# PART 5: TESTING AND VERIFICATION

## 25. Verify the Application on EC2

After deployment, connect to EC2 and execute the following commands.

### Check PM2

```bash
pm2 list
```

Expected status:

```text
name         status
express-app  online
```

In the observed deployment, PM2 displayed two `express-app` instances in cluster mode.

### Check application logs

```bash
pm2 logs express-app
```

This helps identify application startup errors and runtime exceptions.

### Test Node.js directly

```bash
curl -i http://localhost:8000
```

Expected response:

```text
HTTP/1.1 200 OK

It's working
```

### Test Nginx

```bash
curl -i http://localhost
```

Expected response:

```text
HTTP/1.1 200 OK

It's working
```

### Check Nginx status

```bash
sudo systemctl status nginx
```

### Validate Nginx configuration

```bash
sudo nginx -t
```

### Check Nginx error logs

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

## 26. Access the Application Publicly

Once the application, Nginx, and AWS Security Group are configured correctly, open:

```text
http://YOUR_EC2_PUBLIC_DNS
```

Or:

```text
http://YOUR_EC2_PUBLIC_IP
```

Nginx receives the HTTP request on port 80 and forwards it to Express on port 8000.

**Note:** The observed Express endpoint returned `It's working`. This confirms the backend response, not a separately developed frontend website. If the project is expected to display a full frontend homepage, that frontend must also be built and deployed or served through Nginx.

---

# PART 6: TROUBLESHOOTING

## 27. Common Problems and Solutions

### Problem 1: PM2 Script Not Found

Error:

```text
Error: Script not found:
 /var/www/express-app/dist/index.js
```

**Cause:**

The TypeScript application has not been compiled, so the `dist/` directory or expected entry point does not exist.

**Solution:**

```bash
npm run build
```

Verify:

```bash
ls -la dist
```

Then start PM2:

```bash
pm2 start ecosystem.config.cjs
```

### Problem 2: EACCES Permission Denied

Error:

```text
npm ERR! code EACCES
npm ERR! syscall open
npm ERR! path /var/www/express-app/package-lock.json
```

**Cause:**

Some files were owned by root, but npm was being executed by the Ubuntu user.

**Solution:**

```bash
sudo chown -R ubuntu:ubuntu /var/www/express-app
```

Then:

```bash
npm run build
```

### Problem 3: Connection Refused on Port 8000

Error:

```text
curl: (7) Failed to connect to localhost port 8000
```

**Cause:**

The backend process may not be running or may be listening on another port.

**Solution:**

```bash
pm2 list
```

```bash
pm2 logs express-app
```

Check the application port and start the application if necessary.

### Problem 4: 502 Bad Gateway

**Cause:**

Nginx cannot communicate with the upstream Node.js application.

Possible reasons:

- Node.js application is stopped.
- Incorrect upstream port.
- Incorrect Nginx configuration.
- Application is not listening on the expected interface.

**Solution:**

Test the backend:

```bash
curl http://localhost:8000
```

Check Nginx configuration:

```bash
sudo nginx -t
```

Check logs:

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

### Problem 5: Welcome to Nginx Page

**Cause:**

The default Nginx website may still be enabled, or the custom application configuration may not be active.

**Solution:**

```bash
ls -l /etc/nginx/sites-enabled/
```

Check the enabled configuration and disable the default site if appropriate:

```bash
sudo rm /etc/nginx/sites-enabled/default
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Problem 6: Public IP Is Not Accessible

**Possible causes:**

- HTTP port 80 is not allowed in the EC2 Security Group.
- Nginx is not running.
- The browser is using HTTPS even though only HTTP has been configured.
- Network or firewall rules are blocking traffic.

**Solution:**

Verify the EC2 Security Group inbound rules and check Nginx status.

### Problem 7: Application Works Locally but Not Publicly

**Cause:**

The backend may be running correctly, but Nginx or external network access may not be configured correctly.

Test both:

```bash
curl http://localhost:8000
```

```bash
curl http://localhost
```

If the first succeeds and the second fails, investigate Nginx.

If both succeed locally but public access fails, investigate the Security Group and external network path.

---

# PART 7: CI/CD BENEFITS AND LEARNINGS

## 28. Benefits of This Implementation

### Automation

Deployment is triggered automatically when code is pushed to the main branch.

### Reduced manual work

No need to manually copy application files or restart the backend after every code change.

### Consistent builds

GitHub Actions builds the application using a defined Node.js environment and dependency lockfile.

### Process management

PM2 helps keep the application running and provides monitoring and restart functionality.

### Reverse proxy

Nginx provides a single HTTP entry point and forwards requests to the backend.

### Deployment verification

Health checks help detect deployment problems.

## 29. Challenges Faced and Resolutions

| Challenge | Resolution |
|---|---|
| PM2 could not find `dist/index.js` | Built the TypeScript application before starting PM2 |
| npm EACCES permission error | Corrected project ownership using `chown` |
| Application stopped after terminal exit | Used PM2 for background process management |
| Nginx configuration was not enabled | Created a symbolic link from `sites-available` to `sites-enabled` |
| Public DNS did not show the backend response | Tested Node.js and Nginx separately and checked network configuration |
| Multiple application processes appeared | Identified PM2 cluster mode and its two running instances |

## 30. Future Improvements

- Add HTTPS using Let's Encrypt and Certbot.
- Use GitHub Environments for deployment approvals.
- Add automated unit and integration tests.
- Use a dedicated `/health` endpoint for health checks.
- Implement atomic deployments using versioned release directories.
- Implement a complete automatic rollback mechanism.
- Add centralized monitoring and logging.
- Use AWS Systems Manager or another secure deployment mechanism where appropriate.
- Store application secrets securely using AWS Secrets Manager or Parameter Store.
- Add a frontend deployment stage if a frontend is part of the application.

---

## Conclusion

This project demonstrates the implementation of an automated deployment pipeline for a Node.js backend using GitHub Actions and AWS EC2.

It combines source-code management, automated builds, artifact handling, secure server access, Linux administration, Nginx reverse proxy configuration, and PM2 process management into one deployment workflow.

The overall objective is to make application deployment more consistent, repeatable, and less dependent on manual intervention.
