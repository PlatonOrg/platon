import { Injectable } from '@angular/core';
import { elementIsHidden} from './utils/dom';
import { makeButton } from './utils/buttons';

import Shepherd, {
  type Tour,
  type TourOptions,
  type StepOptions,
} from 'shepherd.js';


interface RequiredElement {
  message: string;
  selector: string;
  title: string;
}


@Injectable({
  providedIn: 'root'
})
export class TutoService {

  confirmCancel: TourOptions['confirmCancel'] = false;
  confirmCancelMessage?: TourOptions['confirmCancelMessage'];
  defaultStepOptions: StepOptions = {};
  errorTitle?: string;
  exitOnEsc: TourOptions['exitOnEsc'] = true;
  isActive = false;
  keyboardNavigation: TourOptions['keyboardNavigation'] = true;
  messageForUser: string | null = null;
  modal: boolean = true;
  requiredElements: RequiredElement[] = [];
  tourName: TourOptions['tourName'] = undefined;
  tourObject: Tour | null = null;
  private currentPage: string = '';


  constructor() {}

    /**
   * Sets the current page to track tour context
   */
    setCurrentPage(page: string): void {
      this.currentPage = page;
      // Reset tour if page changes
      if (this.isActive) {
        this.cancel();
        this.isActive = false;
        this.tourObject = null;
      }
    }


      /**
   * Check if elements are in DOM and visible before starting the tour
   */
  private ensureElementsAreVisible(): Promise<boolean> {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 5;

      const checkElements = () => {
        if (this.requiredElementsPresent()) {
          resolve(true);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          console.warn('Tutorial elements not found after multiple attempts');
          resolve(false);
          return;
        }
        // Try again after a short delay
        setTimeout(checkElements, 200);
      };

      checkElements();
    });
  }


  private disposeEChartsInstances(): void {
    if (typeof window !== 'undefined') {
      const echartElements = document.querySelectorAll('[_echarts_instance_]');
      echartElements.forEach(el => {
        // Si echarts est défini globalement
        if (window.echarts && typeof window.echarts.getInstanceByDom === 'function') {
          const instance = window.echarts.getInstanceByDom(el as HTMLElement);
          if (instance) {
            window.echarts.dispose(el as HTMLElement);
          }
        }
      });
    }
  }

  /**
 * Starts the tour with verification that elements are ready
 */
  async start(): Promise<void> {
    this.disposeEChartsInstances();
    if (!this.tourObject) {
      this._initTour();
    }

    if (this.tourObject) {
      // Wait for elements to be visible
      const elementsReady = await this.ensureElementsAreVisible();
      if (elementsReady) {
        console.log('Starting tour for page:', this.currentPage);
        this.tourObject.start();
        this.isActive = true;
      } else {
        console.error('Cannot start tour - required elements not found');
      }
    }
  }



  /**
   * Cancel the tour.
   */
  cancel() : void {
    if (this.tourObject) {
      this.tourObject.cancel();
      this.isActive = false;
    }
  }

  /**
   * Get the tour object and call back
   */
  back() : void {
    if (this.tourObject) {
      this.tourObject.back();
    }
  }

  /**
   * Hides the current step.
   */
  hide() : void {
    if (this.tourObject) {
      this.tourObject.hide();
    }
  }

  /**
   * Complete the tour
   */
  complete() : void {
    if (this.tourObject) {
      this.tourObject.complete();
      this.isActive = false;
    }
  }

  /**
   * Next step of the tour
   */
  next() : void {
    if (this.tourObject) {
      this.tourObject.next();
    }
  }

  /**
   * Show the current step
   */
  show(id: string | number) : void {
    this.tourObject?.show(id);
  }

  onTourFinished(completeOrCancel : any) : void {
    this.isActive = false;
    this.tourObject = null;
  }

  /**
  * Take a set of steps and create a tour object based on the current configuration
  * @param steps An array of steps
  */
  addSteps(steps: StepOptions[]): void {
    this._initTour();
    const tour = this.tourObject;
    if (!tour || steps.length === 0) {
      return;
    }

    // Clear any existing steps
    tour.steps.forEach(step => {
      tour.removeStep(step.id);
    });

    if (!this.requiredElementsPresent()) {
      tour.addStep({
        buttons: [
          {
            text: 'Exit',
            action: () => tour.cancel()
          }
        ],
        id: 'error',
        title: this.errorTitle || 'Elements Not Found',
        text: [this.messageForUser || 'Required elements for the tutorial are not available.'],
      });
      return;
    }

    steps.forEach((step) => {
      if (step.buttons) {
        step.buttons = step.buttons.map(makeButton.bind(this), this);
      }
      tour.addStep(step);
    });
  }


    /**
  * Observes the array of requiredElements, which are the elements that must be present at the start of the tour,
  * and determines if they exist, and are visible, if either is false, it will stop the tour from executing.
  */
  private requiredElementsPresent() : boolean {
    for (const element of this.requiredElements) {
      const selectedElement = document.querySelector(element.selector);
      if (!selectedElement || elementIsHidden(selectedElement as HTMLElement)) {
        this.errorTitle = element.title;
        this.messageForUser = element.message;
        return false;
      }
    }
    return true;
  }

  /**
  * Initializes the tour, creates a new Shepherd.Tour. sets options, and binds events
  */
  private _initTour(): void {
    if (this.tourObject) {
      return; // Tour already initialized
    }

    const tourObject = new Shepherd.Tour({
      confirmCancel: this.confirmCancel,
      confirmCancelMessage: this.confirmCancelMessage,
      defaultStepOptions: this.defaultStepOptions,
      keyboardNavigation: this.keyboardNavigation,
      tourName: this.tourName,
      useModalOverlay: this.modal,
      exitOnEsc: this.exitOnEsc,
    });

    tourObject.on('complete', this.onTourFinished.bind(this, 'complete'));
    tourObject.on('cancel', this.onTourFinished.bind(this, 'cancel'));
    this.tourObject = tourObject as unknown as Tour;
  }

  /**
 * Clear the tour completely - useful when navigating away
 */
  clearTour(): void {
    if (this.tourObject) {
      this.cancel();
      this.tourObject = null;
    }
    this.isActive = false;
  }
}
