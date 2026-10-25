# Best Employee Scoreboard

A website for the bi-weekly Best Employee incentive:

- **Scoreboard** (`index.html`): leader, leaderboard with all 7 categories, where the team needs coaching, and the 6-month certificate race. Anyone with the link can view it.
- **Admin** (`admin.html`): managers sign in with email and password to enter scores, add employees, start each two-week period and mark it final.

It is a plain static site (HTML, CSS, JavaScript, no build step). Scores are stored in [Supabase](https://supabase.com), which also handles the admin login. Both Supabase and the hosting below have free plans that cover a single store.

Until Supabase is connected, the site shows sample data so you can try it.

## Scoring (100 points)

| Category | Points | How it's entered |
|---|---|---|
| Customer service | 20 | Manager score 0–20 |
| Cleaning duties | 15 | Manager score 0–15 |
| Google reviews | 10 | Number of reviews; 20+ = full points, fewer = proportional |
| Teamwork | 15 | Number of peer votes; most votes = 15, others proportional |
| Uniform, hygiene & meals | 15 | Manager score 0–15 |
| Upselling | 15 | Manager score 0–15 |
| Online quiz | 10 | Quiz rank: 1–3 = 10, 4 = 9, 5 = 8, 6–10 = 5, others 0 |

The rules live in `js/scoring.js`. Ties for first place each get a certificate.

## Go live

### 1. Create the database and login (Supabase, ~10 minutes)

1. Sign up at <https://supabase.com> and create a new project (any name, pick a region near you, save the database password somewhere safe).
2. In the project, open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and click **Run**.
3. Open **Authentication → Sign In / Providers** (called *Providers* in some versions) and turn **off** "Allow new users to sign up". Only people you add can sign in.
4. Open **Authentication → Users → Add user → Create new user**. Enter each manager's email and a password, and tick **Auto Confirm User**.
5. Make them admins. In **SQL Editor**, run (change the emails):

   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users
   where email in ('manager@example.com', 'supervisor@example.com');
   ```

6. Open **Project Settings → API** (or **Data API**). Copy the **Project URL** and the **anon public** key into `config.js`:

   ```js
   supabaseUrl: 'https://xxxxxxxx.supabase.co',
   supabaseAnonKey: 'eyJhbGciOi...',
   storeName: 'Your Store Name',
   ```

   The anon key is meant to be public. The database rules only let admins change anything. Never put the `service_role` key in this file.

7. Commit and push the `config.js` change.

### 2. Put the site online

**Option A: GitHub Pages (simplest, free)**

1. On GitHub, open the repo → **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
3. After a minute the site is at `https://<your-github-username>.github.io/employee-dashboard/`. The admin page is that address plus `admin.html`.

Every push to `main` updates the live site.

**Option B: Netlify or Vercel (free, lets you use your own domain easily)**

1. Sign in to <https://app.netlify.com> (or <https://vercel.com>) with GitHub.
2. **Add new site → Import from Git**, pick this repo. Leave the build command empty and the publish directory as the repo root.
3. Deploy. You get an address like `best-employee.netlify.app`, and you can attach your own domain under **Domain settings**.

### 3. Each two weeks

1. Open `admin.html` and sign in.
2. Click **Start period** (the first one starts Mon Oct 26, 2026). Each period is 14 days.
3. Enter scores as you observe them and click **Save scores**. Totals and ranks update as you type.
4. When the two weeks end and all scores are in, click **Mark final**. The leader gets the certificate on the scoreboard and it counts toward the 6-month $250 race.

### Keeping the scoreboard private (optional)

By default anyone with the link can view the scoreboard, which is good for motivating the team. To make it visible to admins only, edit the three `read …` policies in `supabase/schema.sql` as described in the comment there and run the file again.

## Files

```
index.html          Scoreboard
admin.html          Admin sign-in and score entry
config.js           Your Supabase settings and store name
styles.css          Look and feel (light and dark mode)
js/scoring.js       Point rules
js/data.js          Loads data from Supabase
js/dashboard.js     Scoreboard logic
js/admin.js         Admin logic
js/sample.js        Example data shown before Supabase is connected
supabase/schema.sql Tables, admin list and access rules
```

## Try it on your computer

Open a terminal in this folder and run `python3 -m http.server 8000`, then visit <http://localhost:8000>.
