import { Injectable } from '@angular/core';
import { elementIsHidden} from './utils/dom';
import Shepherd, {
  type Tour,
  type TourOptions,
  type TourStep,
  type StepOptions,
} from 'shepherd.js';


interface RequiredElement {
  message: string;
  element: string;
  title: string;
}

@Injectable({
  providedIn: 'root',
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

  constructor() {}

  /**
   * Starts the tour.
   */
  start() : void {
    if (this.tourObject) {
      this.tourObject.start();
      this.isActive = true;
    }
  }

  /**
   * Cancel the tour.
   */
  cancel() : void {
    if (this.tourObject) {
      this.tourObject.cancel();
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

  onTourFinished(completeOrCancel) : void {
    this.isActive = false;
  }

   /**
   * Take a set of steps and create a tour object based on the current configuration
   * @param steps An array of steps
   */
  addSteps(steps: StepOptions[]) : void {

  }


  addSteps(steps: StepOption[]){
    this._initTour();
    const tour = this.tourObject;
    if (!tour || steps.length === 0) {
      return;
    }
    if(!this.requiredElementsPresent()) {
      tour.addStep({
        buttons: [
          {
            text: 'Exit',
            action: tour.cancel()
          }
        ],
        title: this.errorTitle,
        text: this.messageForUser,
      });
      return;
    }

    steps.forEach((step) => {
      if(step.buttons) {
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
    this.requiredElements.forEach((element) => {
      const selectedElement = document.querySelector(element.selector);
      if(!selectedElement || elementIsHidden(selectedElement as HTMLElement)) {
        this.errorTitle = element.title;
        this.messageForUser = element.message;
        return false;
      }
    });
    return true;
  }

  /**
  * Initializes the tour, creates a new Shepherd.Tour. sets options, and binds events
  */
  private _initTour() : void {
    const tourObject = new Shepherd.Tour({
      confirmCancel: this.confirmCancel,
      confirmCancelMessage: this.confirmCancelMessage,
      defaultStepOptions: this.defaultStepOptions,
      keyboardNavigation: this.keyboardNavigation,
      touname: this.tourName,
      useModalOverlay: this.modal,
      exitOnEsc: this.exitOnEsc,
    });
    tourObject.on('complete', this.onTourFinished.bind(this, 'complete'));
    tourObject.on('cancel', this.onTourFinished.bind(this, 'cancel'));
    this.tourObject = tourObject;
  }



}