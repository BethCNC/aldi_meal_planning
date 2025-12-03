import { Button } from '../components/ui/Button'
import { 
  PlusIcon, 
  ArrowRightIcon, 
  CheckIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'

/**
 * Button Test Page
 * 
 * Showcases all button variants, sizes, states, and icon configurations
 * from the Figma design system.
 */
export function ButtonTest() {
  return (
    <div className="min-h-screen bg-surface-page p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-5xl font-semibold text-text-display">Button Component</h1>
          <p className="text-xl font-medium text-text-subtle">
            Design system buttons built from Figma specifications
          </p>
        </div>

        {/* Filled Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">Filled Style</h2>
          
          {/* Small Size */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-text-body">Small Size</h3>
            <div className="flex flex-wrap items-center gap-4 p-6 bg-surface-card rounded-lg">
              <Button variant="filled" size="small" state="default">Button</Button>
              <Button variant="filled" size="small" state="default" iconPosition="leading" iconLeading={<PlusIcon />}>
                Button
              </Button>
              <Button variant="filled" size="small" state="default" iconPosition="trailing" iconTrailing={<ArrowRightIcon />}>
                Button
              </Button>
              <Button variant="filled" size="small" state="default" iconPosition="both" iconLeading={<PlusIcon />} iconTrailing={<ArrowRightIcon />}>
                Button
              </Button>
              <Button variant="filled" size="small" state="default" iconPosition="alone" iconLeading={<PlusIcon />} />
            </div>
          </div>

          {/* Medium Size */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-text-body">Medium Size</h3>
            <div className="flex flex-wrap items-center gap-4 p-6 bg-surface-card rounded-lg">
              <Button variant="filled" size="medium" state="default">Button</Button>
              <Button variant="filled" size="medium" state="default" iconPosition="leading" iconLeading={<PlusIcon />}>
                Button
              </Button>
              <Button variant="filled" size="medium" state="default" iconPosition="trailing" iconTrailing={<ArrowRightIcon />}>
                Button
              </Button>
              <Button variant="filled" size="medium" state="default" iconPosition="both" iconLeading={<PlusIcon />} iconTrailing={<ArrowRightIcon />}>
                Button
              </Button>
              <Button variant="filled" size="medium" state="default" iconPosition="alone" iconLeading={<PlusIcon />} />
            </div>
          </div>

          {/* Large Size */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-text-body">Large Size</h3>
            <div className="flex flex-wrap items-center gap-4 p-6 bg-surface-card rounded-lg">
              <Button variant="filled" size="large" state="default">Button</Button>
              <Button variant="filled" size="large" state="default" iconPosition="leading" iconLeading={<PlusIcon />}>
                Button
              </Button>
              <Button variant="filled" size="large" state="default" iconPosition="trailing" iconTrailing={<ArrowRightIcon />}>
                Button
              </Button>
              <Button variant="filled" size="large" state="default" iconPosition="both" iconLeading={<PlusIcon />} iconTrailing={<ArrowRightIcon />}>
                Button
              </Button>
              <Button variant="filled" size="large" state="default" iconPosition="alone" iconLeading={<PlusIcon />} />
            </div>
          </div>
        </section>

        {/* Outline Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">Outline Style</h2>
          
          <div className="flex flex-wrap items-center gap-4 p-6 bg-surface-card rounded-lg">
            <Button variant="outline" size="small">Small</Button>
            <Button variant="outline" size="medium">Medium</Button>
            <Button variant="outline" size="large">Large</Button>
            <Button variant="outline" size="medium" iconPosition="leading" iconLeading={<PlusIcon />}>
              With Icon
            </Button>
          </div>
        </section>

        {/* Ghost Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">Ghost Style</h2>
          
          <div className="flex flex-wrap items-center gap-4 p-6 bg-surface-card rounded-lg">
            <Button variant="ghost" size="small">Small</Button>
            <Button variant="ghost" size="medium">Medium</Button>
            <Button variant="ghost" size="large">Large</Button>
            <Button variant="ghost" size="medium" iconPosition="leading" iconLeading={<PlusIcon />}>
              With Icon
            </Button>
          </div>
        </section>

        {/* States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">States</h2>
          
          <div className="space-y-4">
            <div className="p-6 bg-surface-card rounded-lg">
              <h3 className="text-lg font-medium text-text-body mb-4">Default, Hover, Focus, Active</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="filled" size="medium" state="default">Default</Button>
                <Button variant="filled" size="medium" state="hover">Hover</Button>
                <Button variant="filled" size="medium" state="focus">Focus</Button>
                <Button variant="filled" size="medium" state="active">Active</Button>
              </div>
            </div>

            <div className="p-6 bg-surface-card rounded-lg">
              <h3 className="text-lg font-medium text-text-body mb-4">Disabled</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="filled" size="medium" state="disabled">Filled Disabled</Button>
                <Button variant="outline" size="medium" state="disabled">Outline Disabled</Button>
                <Button variant="ghost" size="medium" state="disabled">Ghost Disabled</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-medium text-text-body">Interactive Examples</h2>
          
          <div className="p-6 bg-surface-card rounded-lg space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="filled" size="medium" onClick={() => alert('Clicked!')}>
                Click Me
              </Button>
              <Button variant="outline" size="medium" iconPosition="leading" iconLeading={<CheckIcon />}>
                Confirm
              </Button>
              <Button variant="ghost" size="medium" iconPosition="trailing" iconTrailing={<XMarkIcon />}>
                Cancel
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

