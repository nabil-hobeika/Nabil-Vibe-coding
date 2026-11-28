import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: without this, opening the app at http://127.0.0.1:3000 loads the
  // page but blocks its JavaScript, so buttons like Edit silently do nothing.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
