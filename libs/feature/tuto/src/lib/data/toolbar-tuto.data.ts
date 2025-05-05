import { type StepOptions } from 'shepherd.js';


export const builtInButtons = {
  cancel: {
    classes: 'cancel-button',
    secondary: true,
    text: 'Exit',
    type: 'cancel'
  },
  next: {
    classes: 'next-button',
    text: 'Next',
    type: 'next'
  },
  back: {
    classes: 'back-button',
    secondary: true,
    text: 'Back',
    type: 'back'
  }
};

// Default step options
export const defaultStepOptions: StepOptions = {
  classes: 'custom-class-name-1 custom-class-name-2',
  scrollTo: { behavior: 'smooth', block: 'center' },
  cancelIcon: {
    enabled: true
  },
  // Add this to ensure steps only proceed when elements are visible
  when: {
    show() {
      // Log when step is shown for debugging
      console.log(`Showing step: ${this.id}`);
    }
  }
};

// Define the toolbar tour steps
export const toolbarSteps: StepOptions[] = [
  {
    attachTo: {
      element: '#tuto-toolbar-menu-button',
      on: 'bottom',
    },
    buttons: [builtInButtons.cancel, builtInButtons.next],
    classes: 'custom-class-name-1 custom-class-name-2',
    id: 'menu',
    title: 'Menu Principal',
    text: `
      <p>
        Ce bouton ouvre le menu principal de l'application. Vous pouvez y accéder pour naviguer entre les différentes sections.
      </p>
    `,
    // Check if element exists before showing this step
    beforeShowPromise: function() {
      return new Promise<void>((resolve, reject) => {
        const element = document.querySelector('#tuto-toolbar-menu-button');
        if (element && getComputedStyle(element).display !== 'none') {
          console.log('Menu button is visible');
          resolve();
        } else {
          console.error('Menu button not found or not visible');
          reject('Element not found');
        }
      });
    }
  },
  {
    attachTo: {
      element: '#tuto-toolbar-theme-button',
      on: 'bottom',
    },
    buttons: [builtInButtons.cancel, builtInButtons.back, builtInButtons.next],
    classes: 'custom-class-name-1 custom-class-name-2',
    id: 'theme',
    title: 'Changer de Thème',
    text: `
      <p>
        Ce bouton vous permet de basculer entre les thèmes clair, sombre ou système.
      </p>
    `,
    // Check if element exists before showing this step
    beforeShowPromise: function() {
      return new Promise<void>((resolve, reject) => {
        const element = document.querySelector('#tuto-toolbar-theme-button');
        if (element && getComputedStyle(element).display !== 'none') {
          console.log('Theme button is visible');
          resolve();
        } else {
          console.error('Theme button not found or not visible');
          reject('Element not found');
        }
      });
    }
  },
  {
    attachTo: {
      element: '#tuto-toolbar-notifications-button',
      on: 'bottom',
    },
    buttons: [builtInButtons.cancel, builtInButtons.back, builtInButtons.next],
    classes: 'custom-class-name-1 custom-class-name-2',
    id: 'notifications',
    title: 'Notifications',
    text: `
      <p>
        Consultez vos notifications en cliquant ici. Vous serez informé des mises à jour importantes.
      </p>
    `,
    // Check if element exists before showing this step
    beforeShowPromise: function() {
      return new Promise<void>((resolve, reject) => {
        const element = document.querySelector('#tuto-toolbar-notifications-button');
        if (element && getComputedStyle(element).display !== 'none') {
          console.log('Notifications button is visible');
          resolve();
        } else {
          console.error('Notifications button not found or not visible');
          reject('Element not found');
        }
      });
    }
  },
  {
    attachTo: {
      element: '#tuto-toolbar-create-button',
      on: 'bottom',
    },
    buttons: [builtInButtons.cancel, builtInButtons.back, builtInButtons.next],
    classes: 'shepherd-theme-arrows custom-toolbar-class',
    id: 'create',
    title: 'Créer une Ressource',
    text: `
      <p>
        Cliquez sur ce bouton pour créer une nouvelle ressource, comme un cours, une activité ou un cercle.
      </p>
    `,
  }
];
