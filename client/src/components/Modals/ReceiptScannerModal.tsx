import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { File, Camera, X, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptScannerModal({ isOpen, onClose }: ReceiptScannerModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Recent receipts - in a real app, these would be fetched from the API
  const recentReceipts = []; // Could be populated from an API call

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Check if file is an image
    if (!file.type.match('image.*')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    // Open camera on mobile devices
    if (fileInputRef.current) {
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };

  // Scan receipt mutation
  const scanReceiptMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to scan receipt');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Receipt scanned successfully",
        description: `Found ${data.items?.length || 0} items from ${data.merchant || 'unknown merchant'}`,
      });
      
      // Create a transaction from the receipt data
      createTransactionFromReceipt(data);
      
      // Close the modal
      setTimeout(() => {
        onClose();
        setSelectedFile(null);
        setPreview(null);
        setIsUploading(false);
      }, 1000);
      
      // Refresh transactions list
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to scan receipt",
        description: error.message,
        variant: "destructive"
      });
      setIsUploading(false);
    }
  });

  // Create transaction from receipt data
  const createTransactionFromReceipt = async (receiptData: any) => {
    try {
      // Create a transaction based on the total amount
      const transaction = {
        description: `${receiptData.merchant || 'Purchase'}`,
        amount: receiptData.total,
        date: receiptData.date ? new Date(receiptData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isIncome: false,
        notes: `Receipt scanned: ${receiptData.items?.map((item: any) => `${item.name} ($${item.price})`).join(', ')}`,
      };
      
      await apiRequest('POST', '/api/transactions', transaction);
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  };

  const handleScanReceipt = () => {
    if (selectedFile) {
      scanReceiptMutation.mutate(selectedFile);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Scan Receipt
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!preview ? (
            <>
              <div
                className={`border-2 border-dashed ${isDragging ? 'border-primary bg-primary/5' : 'border-neutral-300'} rounded-lg p-8 text-center transition-colors`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="mb-4 text-neutral-600">
                  <File className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-neutral-600 mb-4">
                  Drag and drop your receipt image here or click to upload
                </p>
                <Button onClick={handleButtonClick}>
                  Upload Receipt
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileInputChange}
                />
              </div>
              
              <div className="text-center text-neutral-600 my-4">
                <p className="text-sm">Or</p>
              </div>
              
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center"
                onClick={handleTakePhoto}
              >
                <Camera className="mr-2 h-5 w-5" /> Take Photo
              </Button>
            </>
          ) : (
            <div className="rounded-lg overflow-hidden relative">
              <img src={preview} alt="Receipt preview" className="w-full h-auto max-h-80 object-contain" />
              <div className="absolute top-2 right-2">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={clearSelectedFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4">
                <Button 
                  className="w-full" 
                  onClick={handleScanReceipt}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>Scan Receipt</>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {recentReceipts.length > 0 && (
            <div className="bg-neutral-50 p-4 rounded-lg">
              <p className="text-xs text-neutral-500 mb-2">Recently scanned receipts</p>
              <div className="flex overflow-x-auto space-x-3 pb-2">
                {recentReceipts.map((_, index) => (
                  <div key={index} className="flex-shrink-0 w-14 h-20 bg-neutral-200 rounded flex items-center justify-center text-neutral-400">
                    <Receipt className="h-6 w-6" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
