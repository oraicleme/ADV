import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface ProductImportProps {
  onProductsImported: () => void;
}

export default function ProductImport({ onProductsImported }: ProductImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualCategory, setManualCategory] = useState("");

  const importMutation = trpc.products.import.useMutation();
  const createMutation = trpc.products.create.useMutation();

  const handleTextImport = async () => {
    if (!textInput.trim()) return;

    setIsLoading(true);
    try {
      const lines = textInput.split("\n").filter((line) => line.trim());
      const products = lines.map((line) => {
        const [name, price, category] = line.split(",").map((s) => s.trim());
        return { name, price, category };
      });

      await importMutation.mutateAsync({ products });
      setTextInput("");
      onProductsImported();
      alert(`Imported ${products.length} products!`);
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualName.trim()) return;

    setIsLoading(true);
    try {
      await createMutation.mutateAsync({
        name: manualName,
        price: manualPrice || undefined,
        category: manualCategory || undefined,
      });
      setManualName("");
      setManualPrice("");
      setManualCategory("");
      onProductsImported();
      alert("Product added!");
    } catch (error) {
      console.error("Failed to add product:", error);
      alert("Failed to add product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="manual" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Add Manually</TabsTrigger>
        <TabsTrigger value="text">Paste Text</TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="space-y-3">
        <div>
          <Label>Product Name</Label>
          <Input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Product name"
          />
        </div>
        <div>
          <Label>Price (optional)</Label>
          <Input
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            placeholder="e.g. $19.99"
          />
        </div>
        <div>
          <Label>Category (optional)</Label>
          <Input
            value={manualCategory}
            onChange={(e) => setManualCategory(e.target.value)}
            placeholder="e.g. Electronics"
          />
        </div>
        <Button onClick={handleManualAdd} disabled={isLoading || !manualName.trim()} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Add Product
        </Button>
      </TabsContent>

      <TabsContent value="text" className="space-y-3">
        <div>
          <Label>Paste CSV (name, price, category)</Label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Product Name, $19.99, Electronics&#10;Another Product, $29.99, Home"
            className="w-full h-32 p-2 border rounded text-sm"
          />
        </div>
        <Button onClick={handleTextImport} disabled={isLoading || !textInput.trim()} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Import Products
        </Button>
      </TabsContent>
    </Tabs>
  );
}
