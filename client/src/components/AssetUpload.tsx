import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";

interface AssetUploadProps {
  onAssetUploaded: (url: string) => void;
}

export default function AssetUpload({ onAssetUploaded }: AssetUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSignedUrlMutation = trpc.assets.getSignedUrl.useMutation();
  const createAssetMutation = trpc.assets.create.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PNG, SVG, JPEG, or WebP image");
      return;
    }

    setIsLoading(true);
    try {
      // Get signed URL for upload
      const { fileKey } = await getSignedUrlMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
      });

      // Create a simple upload URL using the fileKey
      // In a real implementation, you'd use the signed URL to upload to S3
      const uploadUrl = `https://storage.example.com/${fileKey}`;

      // For now, create a data URL for local testing
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;

        // Save asset metadata
        await createAssetMutation.mutateAsync({
          type: "logo",
          url: dataUrl,
          fileKey,
          mimeType: file.type,
          fileName: file.name,
          fileSize: file.size,
        });

        onAssetUploaded(dataUrl);
        alert("Logo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload logo");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-3">
      <Label>Upload Logo</Label>
      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 cursor-pointer transition">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          ) : (
            <Upload className="h-6 w-6 mx-auto mb-2" />
          )}
          <p className="text-sm font-medium">
            {isLoading ? "Uploading..." : "Click to upload PNG, SVG, JPEG, WebP"}
          </p>
          <p className="text-xs text-muted-foreground">Max 5 MB</p>
        </button>
      </div>
    </div>
  );
}
