import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { getPageTemplates } from "../utils/gqlQueries/getPageTemplates";

// GraphQL query to retrieve item details:

export default function GraphQLQuery({
  appContext,
  client,
}: {
  appContext: any;
  client: ClientSDK | null;
}) {
  const makeGraphQLQuery = async () => {
    // Get the Sitecore Context ID from the application context:
    const sitecoreContextId = appContext.resourceAccess?.[0]?.context.preview;

    // Check if the Sitecore Context ID is available:
    if (!sitecoreContextId) {
      console.error(
        "Sitecore Context ID not found in application context. Make sure your app is configured to use XM Cloud APIs."
      );
      return;
    }

    // Make the GraphQL query:
    const response = await client?.mutate("xmc.authoring.graphql", {
      params: {
        query: {
          sitecoreContextId,
        },
        body: getPageTemplates,
      },
      onSuccess: (data) => {
        console.log("GraphQL query successful:", data);
      },
      onError: (error) => {
        console.error("GraphQL query failed:", error);
      },
    });
  };

  return <button onClick={makeGraphQLQuery}>Make GraphQL query</button>;
}
