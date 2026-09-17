/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ["mongodb", "pdf-parse", "pdfjs-dist", "mammoth", "word-extractor"] },
};
export default nextConfig;
