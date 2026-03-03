# Smoke Test - Finance Calendar Mobile

## 1) Container Health

```bash
cd /path/to/fi-man/fi-man-mobile
docker compose ps
```

Expected: service `finance-calendar-mobile` is `Up` and healthy.

## 2) App Reachability

Open:
- http://localhost:8081

Expected: login page loads.

## 3) Authentication

- Register a new user
- Log in

Expected: redirected to calendar page.

## 4) Core Actions

- Create an account
- Add one income and one expense transaction
- Verify calendar totals update

## 5) Mobile Layout Check

- Open browser dev tools mobile emulator (e.g., iPhone/Pixel)
- Confirm controls stack and cards fit width without horizontal scrolling

## 6) Restart Persistence

```bash
docker compose restart
```

Expected: previously created account/transactions still exist.
