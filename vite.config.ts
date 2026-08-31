import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isProjectPage = Boolean(
  process.env.GITHUB_ACTIONS && repoName && !repoName.endsWith(".github.io"),
);

export default defineConfig({
  base: process.env.BASE_URL || (isProjectPage ? `/${repoName}/` : "./"),
  plugins: [react()],
});
