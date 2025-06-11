import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorRecord } from './entities/error-record.entity';
import { createHash } from 'crypto';

@Injectable()
export class ErrorTrackingService {
  constructor(
    @InjectRepository(ErrorRecord)
    private errorRecordRepository: Repository<ErrorRecord>,
  ) {}

  async shouldSendAlert(
    subject: string,
    error: Error | unknown,
    throttleIntervalMinutes = 60
  ): Promise<boolean> {
    const errorHash = this.generateErrorHash(subject, error);
    const existingRecord = await this.errorRecordRepository.findOne({
      where: { errorHash }
    });
    const now = new Date();
    if (!existingRecord) {
      await this.errorRecordRepository.save({
        errorHash,
        subject,
        firstOccurrence: now,
        lastOccurrence: now,
        occurrenceCount: 1,
        lastNotificationSent: now
      });
      return true;
    }
    const timeSinceLastNotification = (now.getTime() - existingRecord.lastNotificationSent.getTime()) / (1000 * 60);
    existingRecord.occurrenceCount += 1;
    existingRecord.lastOccurrence = now;
    const shouldNotify = timeSinceLastNotification >= throttleIntervalMinutes;
    if (shouldNotify) {
      existingRecord.lastNotificationSent = now;
    }
    await this.errorRecordRepository.save(existingRecord);
    return shouldNotify;
  }

  private generateErrorHash(subject: string, error: Error | unknown): string {
    let errorString: string;
    if (typeof error === 'object' && error !== null) {
      try {
        errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorString = error instanceof Error
          ? `${error.name}: ${error.message}\n${error.stack}`
          : String(error);
      }
    } else {
      errorString = String(error);
    }
    return createHash('md5').update(`${subject}:${errorString}`).digest('hex');
  }

  async getErrorOccurrenceCount(subject: string, error: Error | unknown): Promise<number> {
    const errorHash = this.generateErrorHash(subject, error);
    const record = await this.errorRecordRepository.findOne({
      where: { errorHash }
    });
    return record?.occurrenceCount || 0;
  }

  /**
   * Réinitialise le timestamp de la dernière notification pour permettre
   * un nouvel essai d'envoi immédiat en cas d'échec
   */
  async resetLastNotificationTimestamp(subject: string, error: Error | unknown): Promise<void> {
    const errorHash = this.generateErrorHash(subject, error);
    const existingRecord = await this.errorRecordRepository.findOne({
      where: { errorHash }
    });

    if (existingRecord) {
      // Réinitialiser le timestamp pour permettre un nouvel envoi immédiat
      existingRecord.lastNotificationSent = new Date(0); // Époque Unix
      await this.errorRecordRepository.save(existingRecord);
    }
  }

  /**
   * Vérifier si on doit envoyer une alerte sans l'enregistrer comme envoyée
   * Utile pour vérifier avant l'envoi réel
   */
  async shouldSendAlertWithoutRecording(
    subject: string,
    error: Error | unknown,
    throttleIntervalMinutes = 60
  ): Promise<boolean> {
    const errorHash = this.generateErrorHash(subject, error);
    const existingRecord = await this.errorRecordRepository.findOne({
      where: { errorHash }
    });

    const now = new Date();

    if (!existingRecord) {
      // Créer un enregistrement sans marquer comme notifié
      await this.errorRecordRepository.save({
        errorHash,
        subject,
        firstOccurrence: now,
        lastOccurrence: now,
        occurrenceCount: 1,
        lastNotificationSent: new Date(0) // Pas encore notifié
      });
      return true;
    }

    // Mettre à jour le compteur d'occurrences
    existingRecord.occurrenceCount += 1;
    existingRecord.lastOccurrence = now;
    await this.errorRecordRepository.save(existingRecord);

    // Vérifier si on doit notifier
    const timeSinceLastNotification = (now.getTime() - existingRecord.lastNotificationSent.getTime()) / (1000 * 60);
    return timeSinceLastNotification >= throttleIntervalMinutes;
  }

  /**
   * Marque une alerte comme envoyée avec succès
   */
  async markAlertAsSent(subject: string, error: Error | unknown): Promise<void> {
    const errorHash = this.generateErrorHash(subject, error);
    const existingRecord = await this.errorRecordRepository.findOne({
      where: { errorHash }
    });

    if (existingRecord) {
      existingRecord.lastNotificationSent = new Date();
      await this.errorRecordRepository.save(existingRecord);
    }
  }
}
