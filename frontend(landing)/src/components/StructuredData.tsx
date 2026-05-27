import { releasesUrl, repositoryUrl, siteConfig, siteUrl } from "@/lib/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl.href}#website`,
      url: siteUrl.href,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: siteConfig.language,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl.href}#application`,
      name: siteConfig.name,
      url: siteUrl.href,
      description: siteConfig.description,
      applicationCategory: "UtilitiesApplication",
      applicationSubCategory: "Self-hosted cloud storage",
      operatingSystem: "Docker, Windows, Android, Linux, macOS",
      codeRepository: repositoryUrl,
      downloadUrl: releasesUrl,
      featureList: [
        "Self-hosted private file storage",
        "Resumable large file uploads",
        "Secure signed media delivery",
        "Content-addressed storage",
        "Windows desktop and server applications",
        "Android companion application",
      ],
    },
  ],
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}
