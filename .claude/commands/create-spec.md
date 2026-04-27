---
description: Create a feature spec file locally using a template
argument-hint: Short feature description
allowed-tools: Read, Write, Glob
---

You are helping to create a new feature spec for this application using a simple local workflow.

User input: $ARGUMENTS 

## High level behavior

Your job will be to turn the user input above into:

- A human friendly feature title
- A detailed markdown spec file under the specs/ directory
- A set of git commands to save the changes locally

## Step 1. Parse the arguments

From `$ARGUMENTS`, extract:

1. `feature_title`  
   - A short, human readable title in Title Case.  
   - Example: "Dark Mode Toggle".

2. `feature_slug`  
   - A git safe slug (lowercase, kebab-case).  
   - Example: `dark-mode-toggle`.

## Step 2. Draft and Save the Spec

First, read the file `specs/template.md` to understand the required structure.
*If the template file does not exist, fall back to a generic Markdown structure with Context, Goals, and Requirements sections.*

Create a new markdown spec document based on that structure and save it in the `specs/` folder using the `feature_slug` (e.g. `specs/dark-mode-toggle.md`).

Do not add implementation details (code) unless necessary for the spec logic.

## Step 3. Final output to the user

After the file is saved, respond to the user with a summary and the exact commands to commit the work locally.

Use this exact format for the output:

Spec file created: `specs/<feature_slug>.md` (based on template)

Run these commands to save your work:
```bash
git status
git add specs/<feature_slug>.md
git commit -m "Add spec for <feature_title>"