import { Button } from "@/components/ui/button";
import { PlusCircle, Receipt, Plus, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddTransactionMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onScanReceipt: () => void;
}

export default function AddTransactionMenu({ isOpen, onToggle, onClose, onScanReceipt }: AddTransactionMenuProps) {
  const handleLinkClick = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="relative">
      <Button
        onClick={onToggle}
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg flex items-center justify-center p-0",
          isOpen ? "bg-neutral-700 hover:bg-neutral-800" : "bg-primary hover:bg-primary-dark"
        )}
        aria-label="Add transaction"
      >
        {isOpen ? <PlusCircle className="h-6 w-6 rotate-45 transition-transform duration-200" /> : <PlusCircle className="h-6 w-6 transition-transform duration-200" />}
      </Button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg w-48 overflow-hidden animate-in fade-in-50 slide-in-from-bottom-5">
          <button
            onClick={() => handleLinkClick(onScanReceipt)}
            className="w-full px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center transition-colors"
          >
            <Receipt className="text-primary mr-3 h-5 w-5" />
            Scan Receipt
          </button>
          
          <button
            onClick={() => handleLinkClick(() => {})} // Navigate to add transaction form
            className="w-full px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center transition-colors"
          >
            <Plus className="text-primary mr-3 h-5 w-5" />
            Add Manually
          </button>
          
          <button
            onClick={() => handleLinkClick(() => {})} // Navigate to link account page
            className="w-full px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center transition-colors"
          >
            <Link2 className="text-primary mr-3 h-5 w-5" />
            Link Account
          </button>
        </div>
      )}
    </div>
  );
}
