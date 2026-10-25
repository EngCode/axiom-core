/**======> Reference By Comment <======
 * ===> 01 - Type Definitions & Options
 * ===> 02 - Helper Functions
 * ===> 03 - Dropdown Component Implementation
 * ===> 04 - Auto-Mounting Initializer
*/

//=====> Type Definitions & Options <=====//

export interface DropdownOptions {
    trigger?: string;
    animationSpeed?: number;
    closeOnSelect?: boolean;
    directionAware?: boolean;
    onSelect?: (value: string, item: HTMLElement) => void;
}

export interface DropdownEventDetail {
    dropdown: HTMLElement;
    selectedValue?: string;
    targetItem?: HTMLElement;
}

//=====> Helper Functions <=====//

//====> Direction Detector <====//
function getDocumentDirection(): 'ltr' | 'rtl' {
    //===> Guard: Check Document <===//
    if (typeof document === 'undefined') return 'ltr';
    const htmlDir = document.documentElement.getAttribute('dir');
    const bodyDir = document.body ? document.body.getAttribute('dir') : null;

    //===> Return Detected Direction <===//
    return (htmlDir === 'rtl' || bodyDir === 'rtl') ? 'rtl' : 'ltr';
}

//====> REM to Pixel Converter <====//
function pxToRem(pixels: number, base: number = 16): string {
    //===> Compute REM Value <===//
    return `${(pixels / base).toFixed(4)}rem`;
}

//=====> Dropdown Component Implementation <=====//

export class PhenixDropdown {
    private element: HTMLElement;
    private options: Required<DropdownOptions>;
    private triggerButton: HTMLElement | null = null;
    private menuList: HTMLElement | null = null;
    private isOpen: boolean = false;

    constructor(element: HTMLElement, userOptions?: DropdownOptions) {
        //===> Guard Clause: Validate Element <===//
        if (!element) throw new Error("PhenixDropdown: Root element is required.");

        //===> Define Instance Props & Defaults <===//
        this.element = element;
        this.options = {
            trigger: userOptions?.trigger || '.px-dropdown-toggle',
            animationSpeed: userOptions?.animationSpeed ?? 200,
            closeOnSelect: userOptions?.closeOnSelect ?? true,
            directionAware: userOptions?.directionAware ?? true,
            onSelect: userOptions?.onSelect || (() => {})
        };

        //===> Initialize Component <===//
        this.init();
    }

    //====> Lifecycle Initializer <====//
    private init(): void {
        //===> Guard Clause: Prevent Duplicate Mounting <===//
        if (this.element.classList.contains('px-mounted')) return;

        //===> Query DOM Nodes <===//
        this.triggerButton = this.element.querySelector(this.options.trigger);
        this.menuList = this.element.querySelector('.px-dropdown-menu');

        //===> Guard Clause: Required Nodes Missing <===//
        if (!this.triggerButton || !this.menuList) return;

        //===> Direction Adjustment <===//
        if (this.options.directionAware) {
            const currentDir = getDocumentDirection();
            this.element.setAttribute('data-direction', currentDir);
        }

        //===> Mark as Mounted <===//
        this.element.classList.add('px-mounted');

        //===> Bind Events <===//
        this.bindEvents();
    }

    //====> Bind Event Listeners <====//
    private bindEvents(): void {
        //===> Trigger Click Handler <===//
        this.triggerButton?.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            this.toggle();
        });

        //===> Item Selection Handler <===//
        this.menuList?.addEventListener('click', (event: MouseEvent) => {
            const target = (event.target as HTMLElement).closest('.px-dropdown-item') as HTMLElement | null;
            if (!target) return;

            //===> Extract Value <===//
            const selectedVal = target.getAttribute('data-value') || target.textContent?.trim() || '';

            //===> Dispatch Custom Selection Event <===//
            this.dispatchCustomEvent('selected', {
                dropdown: this.element,
                selectedValue: selectedVal,
                targetItem: target
            });

            //===> User Callback <===//
            this.options.onSelect(selectedVal, target);

            //===> Close If Configured <===//
            if (this.options.closeOnSelect) this.close();
        });

        //===> Close on Outside Click <===//
        document.addEventListener('click', (event: MouseEvent) => {
            if (!this.isOpen) return;
            const clickInside = this.element.contains(event.target as Node);
            if (!clickInside) this.close();
        });
    }

    //====> Open Dropdown <====//
    public open(): void {
        //===> Guard: Already Open <===//
        if (this.isOpen || !this.menuList) return;

        this.isOpen = true;
        this.element.classList.add('is-active');
        this.menuList.classList.remove('hidden');

        //===> Dispatch Custom Opened Event <===//
        this.dispatchCustomEvent('opened', { dropdown: this.element });
    }

    //====> Close Dropdown <====//
    public close(): void {
        //===> Guard: Already Closed <===//
        if (!this.isOpen || !this.menuList) return;

        this.isOpen = false;
        this.element.classList.remove('is-active');
        this.menuList.classList.add('hidden');

        //===> Dispatch Custom Closed Event <===//
        this.dispatchCustomEvent('closed', { dropdown: this.element });
    }

    //====> Toggle State <====//
    public toggle(): void {
        if (this.isOpen) this.close();
        else this.open();
    }

    //====> Custom Event Dispatcher <====//
    private dispatchCustomEvent(name: string, detail: DropdownEventDetail): void {
        const customEvent = new CustomEvent(`px:dropdown:${name}`, {
            detail: detail,
            bubbles: true,
            cancelable: false
        });
        this.element.dispatchEvent(customEvent);
    }

    //====> Clean Unmount <====//
    public destroy(): void {
        this.close();
        this.element.classList.remove('px-mounted', 'is-active');
        this.element.removeAttribute('data-direction');
    }
}

//=====> Auto-Mounting Initializer <=====//

export function initAllDropdowns(root: Document | HTMLElement = document): PhenixDropdown[] {
    //===> Define Containers & Results <===//
    const instances: PhenixDropdown[] = [];
    const elements = root.querySelectorAll('.px-dropdown:not(.px-mounted)');

    //===> Guard Clause: None Found <===//
    if (elements.length === 0) return instances;

    //===> Loop and Mount Each Component <===//
    elements.forEach((dropdownNode) => {
        const instance = new PhenixDropdown(dropdownNode as HTMLElement);
        instances.push(instance);
    });

    //===> Return Instances <===//
    return instances;
}
