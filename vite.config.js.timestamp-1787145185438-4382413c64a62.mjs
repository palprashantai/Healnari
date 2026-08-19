// vite.config.js
import { defineConfig, loadEnv } from "file:///D:/femcare/Healnari/node_modules/vite/dist/node/index.js";
import react from "file:///D:/femcare/Healnari/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///D:/femcare/Healnari/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "");
    if (!env.VITE_API_URL) {
      throw new Error(
        "VITE_API_URL is not set. A production build needs it pointed at the deployed backend (e.g. VITE_API_URL=https://healnari.onrender.com/api) \u2014 otherwise every API call in the deployed app 404s silently. See vite.config.js / AUDIT_REPORT.md OPS-5."
      );
    }
  }
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.js",
        injectManifest: {},
        includeAssets: ["brand/logo-icon.jpg", "brand/logo-full.jpg"],
        manifest: {
          name: "HealNari | Women's Health",
          short_name: "HealNari",
          description: "Root-cause, doctor-led care for PCOS, hormonal imbalance, and women's health.",
          theme_color: "#2A1647",
          background_color: "#F8F6FF",
          display: "standalone",
          start_url: "/",
          orientation: "portrait",
          categories: ["medical", "health", "lifestyle"],
          shortcuts: [
            {
              name: "Log Health & Period",
              short_name: "Track",
              description: "Log daily symptoms, cycle, and mood",
              url: "/patient-dashboard/tracking",
              icons: [{ src: "/brand/logo-icon.jpg", sizes: "192x192" }]
            },
            {
              name: "Book \u20B9799 Consult",
              short_name: "Consult",
              description: "Book instant consultation with a doctor",
              url: "/patient-dashboard/find-doctor",
              icons: [{ src: "/brand/logo-icon.jpg", sizes: "192x192" }]
            },
            {
              name: "Doctor Queue & Telemed",
              short_name: "Doctor Queue",
              description: "Open patient appointments & teleconsultation room",
              url: "/doctor-dashboard/appointments",
              icons: [{ src: "/brand/logo-icon.jpg", sizes: "192x192" }]
            },
            {
              name: "Prescriptions & Vault",
              short_name: "Rx Vault",
              description: "Access digital prescriptions & lab records",
              url: "/patient-dashboard/records",
              icons: [{ src: "/brand/logo-icon.jpg", sizes: "192x192" }]
            }
          ],
          icons: [
            {
              src: "/brand/logo-icon.jpg",
              sizes: "192x192",
              type: "image/jpeg",
              purpose: "any"
            },
            {
              src: "/brand/logo-icon.jpg",
              sizes: "192x192",
              type: "image/jpeg",
              purpose: "maskable"
            },
            {
              src: "/brand/logo-icon.jpg",
              sizes: "512x512",
              type: "image/jpeg",
              purpose: "any"
            },
            {
              src: "/brand/logo-icon.jpg",
              sizes: "512x512",
              type: "image/jpeg",
              purpose: "maskable"
            }
          ]
        }
      })
    ],
    server: {
      port: 3e3,
      open: true,
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxmZW1jYXJlXFxcXEhlYWxuYXJpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxmZW1jYXJlXFxcXEhlYWxuYXJpXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9mZW1jYXJlL0hlYWxuYXJpL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XHJcbi8vIEZvcmNlIFZpdGUgcmVzdGFydCBmb3IgcmVjaGFydHMgZGVwZW5kZW5jeVxyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kLCBtb2RlIH0pID0+IHtcclxuICAvLyBBVURJVF9SRVBPUlQubWQgT1BTLTUgXHUyMDE0IHRoZSBkZXYgc2VydmVyJ3MgL2FwaSBwcm94eSBiZWxvdyBuZXZlciBhcHBsaWVzXHJcbiAgLy8gdG8gYSBwcm9kdWN0aW9uIGJ1aWxkLiBXaXRob3V0IFZJVEVfQVBJX1VSTCBzZXQsIHRoZSBkZXBsb3llZCBidW5kbGVcclxuICAvLyBmYWxscyBiYWNrIHRvIHJlbGF0aXZlIC9hcGkvLi4uIHBhdGhzIGFnYWluc3Qgd2hhdGV2ZXIgc3RhdGljIGhvc3RcclxuICAvLyBzZXJ2ZXMgaXQgXHUyMDE0IHRoaXMgYXBwJ3MgZnJvbnRlbmQgKFZlcmNlbCkgYW5kIGJhY2tlbmQgKFJlbmRlcikgYXJlIG5ldmVyXHJcbiAgLy8gc2FtZS1vcmlnaW4sIHNvIHRoYXQncyBhIGd1YXJhbnRlZWQgc2lsZW50IDQwNCBvbiBldmVyeSByZXF1ZXN0LiBUaGVcclxuICAvLyBidWlsZCB1c2VkIHRvIHN1Y2NlZWQgY2xlYW5seSB3aGlsZSBzaGlwcGluZyBhIGNvbXBsZXRlbHkgYnJva2VuIGFwcDtcclxuICAvLyBmYWlsIGl0IGxvdWRseSBpbnN0ZWFkLlxyXG4gIGlmIChjb21tYW5kID09PSAnYnVpbGQnKSB7XHJcbiAgICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICAgIGlmICghZW52LlZJVEVfQVBJX1VSTCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgJ1ZJVEVfQVBJX1VSTCBpcyBub3Qgc2V0LiBBIHByb2R1Y3Rpb24gYnVpbGQgbmVlZHMgaXQgcG9pbnRlZCBhdCB0aGUgZGVwbG95ZWQgYmFja2VuZCAnICtcclxuICAgICAgICAnKGUuZy4gVklURV9BUElfVVJMPWh0dHBzOi8vaGVhbG5hcmkub25yZW5kZXIuY29tL2FwaSkgJyArXHJcbiAgICAgICAgJ1x1MjAxNCBvdGhlcndpc2UgZXZlcnkgQVBJIGNhbGwgaW4gdGhlICcgK1xyXG4gICAgICAgICdkZXBsb3llZCBhcHAgNDA0cyBzaWxlbnRseS4gU2VlIHZpdGUuY29uZmlnLmpzIC8gQVVESVRfUkVQT1JULm1kIE9QUy01LidcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG5yZXR1cm4ge1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JyxcclxuICAgICAgc3RyYXRlZ2llczogJ2luamVjdE1hbmlmZXN0JyxcclxuICAgICAgc3JjRGlyOiAnc3JjJyxcclxuICAgICAgZmlsZW5hbWU6ICdzdy5qcycsXHJcbiAgICAgIGluamVjdE1hbmlmZXN0OiB7fSxcclxuICAgICAgaW5jbHVkZUFzc2V0czogWydicmFuZC9sb2dvLWljb24uanBnJywgJ2JyYW5kL2xvZ28tZnVsbC5qcGcnXSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBuYW1lOiAnSGVhbE5hcmkgfCBXb21lblxcJ3MgSGVhbHRoJyxcclxuICAgICAgICBzaG9ydF9uYW1lOiAnSGVhbE5hcmknLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUm9vdC1jYXVzZSwgZG9jdG9yLWxlZCBjYXJlIGZvciBQQ09TLCBob3Jtb25hbCBpbWJhbGFuY2UsIGFuZCB3b21lblxcJ3MgaGVhbHRoLicsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMkExNjQ3JyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI0Y4RjZGRicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IFsnbWVkaWNhbCcsICdoZWFsdGgnLCAnbGlmZXN0eWxlJ10sXHJcbiAgICAgICAgc2hvcnRjdXRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdMb2cgSGVhbHRoICYgUGVyaW9kJyxcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogJ1RyYWNrJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMb2cgZGFpbHkgc3ltcHRvbXMsIGN5Y2xlLCBhbmQgbW9vZCcsXHJcbiAgICAgICAgICAgIHVybDogJy9wYXRpZW50LWRhc2hib2FyZC90cmFja2luZycsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6ICcvYnJhbmQvbG9nby1pY29uLmpwZycsIHNpemVzOiAnMTkyeDE5MicgfV1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdCb29rIFx1MjBCOTc5OSBDb25zdWx0JyxcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogJ0NvbnN1bHQnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Jvb2sgaW5zdGFudCBjb25zdWx0YXRpb24gd2l0aCBhIGRvY3RvcicsXHJcbiAgICAgICAgICAgIHVybDogJy9wYXRpZW50LWRhc2hib2FyZC9maW5kLWRvY3RvcicsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6ICcvYnJhbmQvbG9nby1pY29uLmpwZycsIHNpemVzOiAnMTkyeDE5MicgfV1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdEb2N0b3IgUXVldWUgJiBUZWxlbWVkJyxcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogJ0RvY3RvciBRdWV1ZScsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbiBwYXRpZW50IGFwcG9pbnRtZW50cyAmIHRlbGVjb25zdWx0YXRpb24gcm9vbScsXHJcbiAgICAgICAgICAgIHVybDogJy9kb2N0b3ItZGFzaGJvYXJkL2FwcG9pbnRtZW50cycsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6ICcvYnJhbmQvbG9nby1pY29uLmpwZycsIHNpemVzOiAnMTkyeDE5MicgfV1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdQcmVzY3JpcHRpb25zICYgVmF1bHQnLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiAnUnggVmF1bHQnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjY2VzcyBkaWdpdGFsIHByZXNjcmlwdGlvbnMgJiBsYWIgcmVjb3JkcycsXHJcbiAgICAgICAgICAgIHVybDogJy9wYXRpZW50LWRhc2hib2FyZC9yZWNvcmRzJyxcclxuICAgICAgICAgICAgaWNvbnM6IFt7IHNyYzogJy9icmFuZC9sb2dvLWljb24uanBnJywgc2l6ZXM6ICcxOTJ4MTkyJyB9XVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnL2JyYW5kL2xvZ28taWNvbi5qcGcnLFxyXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvanBlZycsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnknXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICcvYnJhbmQvbG9nby1pY29uLmpwZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9qcGVnJyxcclxuICAgICAgICAgICAgcHVycG9zZTogJ21hc2thYmxlJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnL2JyYW5kL2xvZ28taWNvbi5qcGcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvanBlZycsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnknXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICcvYnJhbmQvbG9nby1pY29uLmpwZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9qcGVnJyxcclxuICAgICAgICAgICAgcHVycG9zZTogJ21hc2thYmxlJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICBdLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIG9wZW46IHRydWUsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVAsU0FBUyxjQUFjLGVBQWU7QUFFdlIsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUd4QixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFNBQVMsS0FBSyxNQUFNO0FBUWpELE1BQUksWUFBWSxTQUFTO0FBQ3ZCLFVBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUMzQyxRQUFJLENBQUMsSUFBSSxjQUFjO0FBQ3JCLFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxNQUlGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFRixTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsUUFDZCxZQUFZO0FBQUEsUUFDWixRQUFRO0FBQUEsUUFDUixVQUFVO0FBQUEsUUFDVixnQkFBZ0IsQ0FBQztBQUFBLFFBQ2pCLGVBQWUsQ0FBQyx1QkFBdUIscUJBQXFCO0FBQUEsUUFDNUQsVUFBVTtBQUFBLFVBQ1IsTUFBTTtBQUFBLFVBQ04sWUFBWTtBQUFBLFVBQ1osYUFBYTtBQUFBLFVBQ2IsYUFBYTtBQUFBLFVBQ2Isa0JBQWtCO0FBQUEsVUFDbEIsU0FBUztBQUFBLFVBQ1QsV0FBVztBQUFBLFVBQ1gsYUFBYTtBQUFBLFVBQ2IsWUFBWSxDQUFDLFdBQVcsVUFBVSxXQUFXO0FBQUEsVUFDN0MsV0FBVztBQUFBLFlBQ1Q7QUFBQSxjQUNFLE1BQU07QUFBQSxjQUNOLFlBQVk7QUFBQSxjQUNaLGFBQWE7QUFBQSxjQUNiLEtBQUs7QUFBQSxjQUNMLE9BQU8sQ0FBQyxFQUFFLEtBQUssd0JBQXdCLE9BQU8sVUFBVSxDQUFDO0FBQUEsWUFDM0Q7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFNO0FBQUEsY0FDTixZQUFZO0FBQUEsY0FDWixhQUFhO0FBQUEsY0FDYixLQUFLO0FBQUEsY0FDTCxPQUFPLENBQUMsRUFBRSxLQUFLLHdCQUF3QixPQUFPLFVBQVUsQ0FBQztBQUFBLFlBQzNEO0FBQUEsWUFDQTtBQUFBLGNBQ0UsTUFBTTtBQUFBLGNBQ04sWUFBWTtBQUFBLGNBQ1osYUFBYTtBQUFBLGNBQ2IsS0FBSztBQUFBLGNBQ0wsT0FBTyxDQUFDLEVBQUUsS0FBSyx3QkFBd0IsT0FBTyxVQUFVLENBQUM7QUFBQSxZQUMzRDtBQUFBLFlBQ0E7QUFBQSxjQUNFLE1BQU07QUFBQSxjQUNOLFlBQVk7QUFBQSxjQUNaLGFBQWE7QUFBQSxjQUNiLEtBQUs7QUFBQSxjQUNMLE9BQU8sQ0FBQyxFQUFFLEtBQUssd0JBQXdCLE9BQU8sVUFBVSxDQUFDO0FBQUEsWUFDM0Q7QUFBQSxVQUNGO0FBQUEsVUFDQSxPQUFPO0FBQUEsWUFDTDtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxZQUNBO0FBQUEsY0FDRSxLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsY0FDTixTQUFTO0FBQUEsWUFDWDtBQUFBLFlBQ0E7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxjQUNOLFNBQVM7QUFBQSxZQUNYO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNBLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
