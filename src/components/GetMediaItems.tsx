"use client";

import '../styles/globals.css';
import { useEffect, useState } from "react";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { FileUpload } from "./FileUpload";
interface MediaItem {
  id: string;
  name: string;
  path?: string;
  template?: string;
}

interface GetMediaItemsProps {
  appContext: any;
  client: ClientSDK | null;
  onMediaSelect?: (media: MediaItem) => void;
}

export default function GetMediaItems({
  appContext,
  client,
  onMediaSelect,
}: GetMediaItemsProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ Track current folder path
  const [currentPath, setCurrentPath] = useState("/sitecore/media library");

  const makeGraphQLQuery = async (path: string) => {
    const sitecoreContextId = appContext?.resourceAccess?.[0]?.context?.preview;
    if (!sitecoreContextId) {
      console.error("❌ Sitecore Context ID not found.");
      return;
    }

    // ✅ Build query dynamically using the current path
    const query = `
      query {
        item(where: { path: "${path}" }) {
          name
          path
          itemId
          children {
            nodes {
              itemId
              name
              path
              template {
                name
              }
            }
          }
        }
      }
    `;

    await client?.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId },
        body: { query },
      },
      onSuccess: (data: any) => {
        const nodes = data?.data?.data?.item?.children?.nodes;
        const nodeArray = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];

        const extracted: MediaItem[] = nodeArray.map((node: any) => ({
          id: node.itemId ?? node.path,
          name: node.name,
          path: node.path,
          template: node.template?.name,
        }));

        setMediaItems(extracted);
      },
      onError: (error: any) => {
        console.error("❌ GraphQL query failed:", error);
      },
    });
  };

  const handleSelect = (media: MediaItem) => {
    // ✅ If it's a folder, navigate into it instead of selecting
    if (media.template === "Media folder") {
      setCurrentPath(media.path || "/sitecore/media library");
      return;
    }

    // ✅ If it's a file, select it
    setSelectedMedia(media);
    setIsModalOpen(false);
    onMediaSelect?.(media);
  };

  // ✅ Fetch media items whenever path changes
  useEffect(() => {
    makeGraphQLQuery(currentPath);
  }, [currentPath]);

  return (
    <div className="p-4">
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Select Media
      </button>

      <FileUpload appContext={appContext}
              client={client}/>

      {selectedMedia && (
        <div className="mt-4 flex items-center space-x-3">
          {(() => {
            const mediaUrl =
              selectedMedia.template === "Media folder"
                ? "https://xmc-espireinfol3993-espirestartef06-dev.sitecorecloud.io/sitecore/shell/-/icon/Applications/32x32/folder.png.aspx?rev=b1625fff-bfe4-4c43-9b56-facb8cc34ee0&la=en"
                : `https://xmc-espireinfol3993-espirestartef06-dev.sitecorecloud.io/sitecore/shell/themes/standard/-/media/${selectedMedia.id}.ashx?h=100&thn=1&w=100`;

            return (
              <>
                <img
                  src={mediaUrl}
                  alt={selectedMedia.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <span>{selectedMedia.name}</span>
              </>
            );
          })()}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-[9999]"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-y-auto max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b p-4">
              <div className="flex items-center space-x-2">
                {/* ✅ Optional: Back button */}
                {currentPath !== "/sitecore/media library" && (
                  <button
                    onClick={() =>
                      setCurrentPath(
                        currentPath.substring(0, currentPath.lastIndexOf("/"))
                      )
                    }
                    className="text-blue-600 hover:underline"
                  >
                    ← Back
                  </button>
                )}
                <h2 className="text-lg font-semibold truncate">
                  {currentPath.replace("/sitecore/media library", "Media Library")}
                </h2>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4">
              {mediaItems.map((media) => {
                const mediaUrl =
                  media.template === "Media folder"
                    ? "https://xmc-espireinfol3993-espirestartef06-dev.sitecorecloud.io/sitecore/shell/-/icon/Applications/32x32/folder.png.aspx?rev=b1625fff-bfe4-4c43-9b56-facb8cc34ee0&la=en"
                    : `https://xmc-espireinfol3993-espirestartef06-dev.sitecorecloud.io/sitecore/shell/themes/standard/-/media/${media.id}.ashx?h=100&thn=1&w=100`;

                return (
                  <div
                    key={media.id}
                    onClick={() => handleSelect(media)}
                    className="cursor-pointer rounded-lg overflow-hidden border hover:shadow-lg transition"
                  >
                    <img
                      src={mediaUrl}
                      alt={media.name}
                      className="object-cover w-full h-32"
                    />
                    <div className="text-center text-sm p-1 truncate">
                      {media.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
