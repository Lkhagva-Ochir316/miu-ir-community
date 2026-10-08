# MIU IR Community

A responsive campus community for the International Relations (IR) department at Mongolian International University. Students and teachers can share text and photo posts, publish announcements, and add member profiles with department details.

## Run locally

Open `index.html` in a modern browser. No build step or dependency installation is required.

## Public link

**[MIU IR COMMUNITY](https://tinyurl.com/miu-ir-community)**

The branded share link redirects to the public site. GitHub Pages deployment is defined in `.github/workflows/deploy-pages.yml` and publishes this app-only repository from `main`. The `Angel` repository remains private. The public deployment source is intentionally limited to the website files in this repository.

## Accounts and storage

New visitors create an account with their name, MIU role, email, and password, then sign in on that device. Passwords are stored as salted PBKDF2 hashes. Account, profile, post, and photo data live only in that browser's `localStorage`; they are not sent to a school server, shared with other devices, or protected by production authentication. This demo is not suitable for real credentials or sensitive personal information. Clearing browser site data removes local accounts and content.

Sample people and sample posts have been removed. After signing up, members can complete their profile, share posts and photos, and create announcements. Uploaded photos are limited to 2 MB each.

## Main files

- `index.html` — sign-in/sign-up pages, community UI, and profile/post dialog
- `styles.css` — responsive interface styles
- `app.js` — local account flow, feed, people directory, photo previews, and browser storage
