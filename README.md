# wp-hosting

Set of scripts to manage virtual wordpress servers for different clients.

Each server consists in a wordpress installation, phpmyadmin, mysql and an automated backup tool.

## Scripts

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

