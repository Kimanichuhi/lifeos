/*
# Add link + due date to projects

## Overview
Projects had no way to attach a URL (repo, live site, doc) or a target
completion date — every other planning entity (goals, tasks) already has a
date field, projects didn't.

## Modified Tables
- projects
  - ADD `link` (text, nullable) — an external URL for the project
  - ADD `due_date` (date, nullable) — target completion date
*/

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS due_date date;
