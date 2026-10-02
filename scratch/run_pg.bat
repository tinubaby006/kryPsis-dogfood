.\pgsql\bin\pg_ctl.exe -D .\pgsql\data -l logfile start
ping 127.0.0.1 -n 3 > nul
.\pgsql\bin\psql.exe -U dogfood -d postgres -c "ALTER USER dogfood WITH PASSWORD 'dogfoodpassword';"
.\pgsql\bin\createdb.exe -U dogfood dogfood_db
