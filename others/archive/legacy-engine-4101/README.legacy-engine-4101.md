# Legacy Engine (Archived)

**Status: DEPRECATED / ARCHIVED**

This folder contains the old Engine implementation that ran on port **4101** and exposed the `/engine` endpoint.

It has been replaced by the **New Engine** (`backend-api-v1.http-server`) which runs on port **4201** and exposes `/api/entry-step`.

## Contents

- `backend-api-v1.adapter`: The old Node.js/Express (or HTTP) server that acted as the engine adapter.

## Why is this here?

We have migrated the Student Viewer and Dev Tool to use the new Engine. This code is kept for historical reference only and should not be used in the active application.

## Active Engine

The active engine code is located in `backend-api-v1.http-server` at the repository root.
