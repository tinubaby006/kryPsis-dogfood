Write-Host "Extracting PostgreSQL using tar..."
tar.exe -xf pg.zip
Write-Host "Initializing Database..."
.\pgsql\bin\initdb.exe -D .\pgsql\data -U dogfood -E UTF8
Write-Host "Starting Database..."
.\pgsql\bin\pg_ctl.exe -D .\pgsql\data -l logfile start
Start-Sleep -Seconds 5
Write-Host "Configuring User and Database..."
.\pgsql\bin\psql.exe -U dogfood -d postgres -c "ALTER USER dogfood WITH PASSWORD 'dogfoodpassword';"
.\pgsql\bin\createdb.exe -U dogfood dogfood_db
Write-Host "PostgreSQL Setup Complete."
