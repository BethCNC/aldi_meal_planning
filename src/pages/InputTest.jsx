import { Input } from '../components/ui/Input'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '../components/ui/Button'

/**
 * Input Test Page
 * 
 * Showcases all input variants, states, and configurations
 * from the Figma design system.
 */
export function InputTest() {
  return (
    <div className="min-h-screen bg-surface-page p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-5xl font-semibold text-text-display">Input Component</h1>
          <p className="text-xl font-medium text-text-subtle">
            Design system inputs built from Figma specifications
          </p>
        </div>

        {/* Default State */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">Default State</h2>
          
          <div className="space-y-4 p-6 bg-surface-card rounded-lg">
            <Input
              label="First name"
              placeholder="Enter your first name"
            />
            
            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
            />
            
            <Input
              placeholder="No label input"
            />
          </div>
        </section>

        {/* With Icons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">With Icons</h2>
          
          <div className="space-y-4 p-6 bg-surface-card rounded-lg">
            <Input
              label="Search"
              placeholder="Search recipes..."
              leadIcon={<MagnifyingGlassIcon />}
            />
            
            <Input
              label="Clearable input"
              placeholder="Type to search..."
              trailIcon={<XMarkIcon />}
            />
            
            <Input
              label="Both icons"
              placeholder="Search and clear"
              leadIcon={<MagnifyingGlassIcon />}
              trailIcon={<XMarkIcon />}
            />
          </div>
        </section>

        {/* With Button */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">With Button</h2>
          
          <div className="space-y-4 p-6 bg-surface-card rounded-lg">
            <Input
              label="Input with action"
              placeholder="Enter value"
              button={
                <Button size="small" variant="filled">
                  Submit
                </Button>
              }
            />
          </div>
        </section>

        {/* States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">States</h2>
          
          <div className="space-y-4 p-6 bg-surface-card rounded-lg">
            <Input
              label="Default State"
              placeholder="Default input"
              state="default"
            />
            
            <Input
              label="Active State"
              placeholder="Active input"
              state="active"
              defaultValue="Active value"
            />
            
            <Input
              label="Disabled State"
              placeholder="Disabled input"
              state="disabled"
              defaultValue="Disabled value"
            />
          </div>
        </section>

        {/* With Helper Text */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">Helper Text</h2>
          
          <div className="space-y-4 p-6 bg-surface-card rounded-lg">
            <Input
              label="Input with helper"
              placeholder="Enter value"
              helperText="Add some text to assist your users."
            />
            
            <Input
              label="Input with error"
              placeholder="Enter value"
              error="This field is required"
            />
          </div>
        </section>

        {/* All Features Combined */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">All Features</h2>
          
          <div className="space-y-4 p-6 bg-surface-card rounded-lg">
            <Input
              label="Complete Input"
              placeholder="Search recipes..."
              leadIcon={<MagnifyingGlassIcon />}
              trailIcon={<XMarkIcon />}
              helperText="Type to search for recipes"
              button={
                <Button size="small" variant="filled">
                  Search
                </Button>
              }
            />
          </div>
        </section>
      </div>
    </div>
  )
}

