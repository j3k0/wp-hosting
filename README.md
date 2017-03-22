# wp-hosting

Set of scripts to manage virtual wordpress servers for different clients.

Each server consists in a wordpress installation, phpmyadmin, mysql and an automated backup tool.

## Architecture

All sites are in subdirectories of the wp-hosting directories. I generally like to call them `wp.<client>.<domain>` (example: wp.microsoft.live.com).

In each directory:

 - backups
 - config
 - docker-compose.yml
 - nginx-site
 - php.ini
 - ssl/nginx.crt ssl/nginx.key

`config` contains the high level informations used to generate all other files.

 - `DOMAIN` is a list of domain names.
 - `*_PORT` different ports to use for the services.
 - `ROOT_PASSWORD` database superuser password.
 - `ADMIN_PASSWORD` normal user and wordpress admin password.
 - `SALT` wordpress authentication salt.

When you __create__ a project, the `config` file is generated.

When you __initialize__ a project, the other files are generated.

When you __start__ a project, service are started using the configuration files in the project folder. You can also customize them before if needed.

## Tasks

#### Deploy a new site

We need to __create__, __initialize__ then __start__ a new project.

The project is for client `albert` that want to start a website for domain `hellokitty.com`. So we call the project `wp.albert.hellokitty.com`.

    ./create.sh wp.albert.hellokitty.com hellokitty.com

It'll generate a self-generated ssl certificate, you can fill real information of just go with the defaults. (ENTER ENTER ENTER...)

Let's check the configuration with `cat wp.albert.hellokitty.com/config`. Seems good, we can initialize the project.

    ./initialize.sh wp.albert.hellokitty.com

This will take a bit more than a minute to complete. Hopefully everything went fine. The project directory now contains a handful of new config files.

You might want to edit the `nginx-site` file if your website has additional domain names (see the `server_name` options).

We can now start the services.

    ./start.sh wp.albert.hellokitty.com

Once started, we need to reload the nginx configuration.

    sudo service nginx reload

Last thing last, send the configuration details to the appropriate IT department.

    ./info.sh wp.albert.hellokitty

Send it by email!

## Scripts

For the most up-to-date documentation, use `--help` options.

#### create.sh &lt;project&gt;

Generate a new project with a config file.

Use the first available port and generate random passwords.

#### initialize.sh &lt;project&gt;

Initialize a server from its config file.

Generates a docker-compose.yml file, prepare the database.

#### start.sh &lt;project&gt;

Starts the server.

#### stop.sh &lt;project&gt;

Stops the server.

#### cleanup.sh &lt;project&gt;

Delete a server. All run-time files will be deleted.

Backups will not be removed.

#### backup.sh &lt;project&gt;

Force a new backup.

Note that when a server is running, daily backups are performed.

#### restore.sh &lt;project&gt; &lt;date&gt;

Restore a backup.

#### logs.sh &lt;project&gt;

Display server logs.

#### import.sh &lt;project&gt; &lt;date&gt;

Import a project just copied from another host.

Will update the config file to use available port on this host and restore the specified backup.

## Import an existing website

## Migrate a website to another server

# Troubleshooting

## AIO-related error when starting mysql..

http://johanlouwers.blogspot.com/2010/02/aio-max-nr-parameter-for-oracle.html

echo 1048576 > /proc/sys/fs/aio-max-nr
