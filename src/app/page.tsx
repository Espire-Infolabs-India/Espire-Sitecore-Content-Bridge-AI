"use client";
import { useState, useEffect } from "react";
import type {
  ApplicationContext,
  PagesContext,
} from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import DocumentImporter from "../components/DocumentImporter";

function App() {
  const { client, error, isInitialized } = useMarketplaceClient();
  const [appContext, setAppContext] = useState<ApplicationContext>();

  useEffect(() => {
    if (!error && isInitialized && client) {
      console.log("Marketplace client initialized successfully.", client);

      // Always query the application context
      client
        .query("application.context")
        .then((res) => {
          console.log("Success retrieving application.context:", res.data);
          setAppContext(res.data);
        })
        .catch((error) => {
          console.error("Error retrieving application.context:", error);
        });
    } else if (error) {
      console.error("Error initializing Marketplace client:", error);
    }
  }, [client, error, isInitialized]);

  return (
    <>
      {isInitialized && (
        <>
          <div className="application-context">
            <DocumentImporter appContext={appContext} client={client} />
          </div>
        </>
      )}
      {error && <p style={{ color: "red" }}>Error: {String(error)}</p>}
    </>
  );
}

export default App;
