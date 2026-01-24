/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    WW_APPSCRIPT_URL: process.env.WW_APPSCRIPT_URL || process.env.NEXT_PUBLIC_WW_APPSCRIPT_URL || "",
    LICENSE_API_URL: process.env.LICENSE_API_URL || process.env.NEXT_PUBLIC_LICENSE_API_URL || "",
  },
};

export default nextConfig;
