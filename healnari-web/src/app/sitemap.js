export default async function sitemap() {
  const baseUrl = 'https://www.healnari.com'; // Replace with production URL

  // In a real app, you would fetch all dynamic routes here, e.g. doctor profiles
  // const res = await fetch('http://localhost:3000/api/doctors/search');
  // const { data: doctors } = await res.json();
  const doctors = []; // Placeholder

  const staticRoutes = [
    '',
    '/for-doctors',
    '/doctors/search',
    '/calculators/ovulation',
    '/calculators/pcos-risk',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));

  const dynamicRoutes = doctors.map((doc) => ({
    url: `${baseUrl}/doctors/${doc.id}`, // Example if dynamic doctor pages existed
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
