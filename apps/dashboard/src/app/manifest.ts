import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Satopod.farm",
    short_name: "Satopod",
    description: "A Progressive Web App built with Next.js",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#000000",
    // icons: [
    //   {
    //     src: "/icon-192x192.png",
    //     sizes: "192x192",
    //     type: "image/png",
    //   },
    //   {
    //     src: "/icon-512x512.png",
    //     sizes: "512x512",
    //     type: "image/png",
    //   },
    // ],
  };
}
