"use server"

import { revalidatePath } from "next/cache"
import { sqliteHelpers } from "@/lib/database/sqlite"

export interface AppSettings {
  companyName: string
  currency: string
  timezone: string
  lowStockThreshold: number
  emailNotifications: boolean
  lowStockAlerts: boolean
  dailyReports: boolean
  autoBackup: boolean
  backupRetentionDays: number
  twoFactorAuth: boolean
  sessionTimeout: boolean
  sessionDuration: number
}

// Default settings
const defaultSettings: AppSettings = {
  companyName: "Nexless Industries",
  currency: "USD",
  timezone: "UTC",
  lowStockThreshold: 10,
  emailNotifications: false,
  lowStockAlerts: true,
  dailyReports: false,
  autoBackup: true,
  backupRetentionDays: 30,
  twoFactorAuth: false,
  sessionTimeout: true,
  sessionDuration: 60
}

export async function getSettings(): Promise<AppSettings> {
  try {
    // Get all settings from SQLite
    const storedSettings = sqliteHelpers.getAllSettings()
    
    // Merge with defaults for any missing settings
    const settings: AppSettings = {
      companyName: storedSettings.companyName || defaultSettings.companyName,
      currency: storedSettings.currency || defaultSettings.currency,
      timezone: storedSettings.timezone || defaultSettings.timezone,
      lowStockThreshold: storedSettings.lowStockThreshold ? parseInt(storedSettings.lowStockThreshold) : defaultSettings.lowStockThreshold,
      emailNotifications: storedSettings.emailNotifications ? storedSettings.emailNotifications === 'true' : defaultSettings.emailNotifications,
      lowStockAlerts: storedSettings.lowStockAlerts ? storedSettings.lowStockAlerts === 'true' : defaultSettings.lowStockAlerts,
      dailyReports: storedSettings.dailyReports ? storedSettings.dailyReports === 'true' : defaultSettings.dailyReports,
      autoBackup: storedSettings.autoBackup ? storedSettings.autoBackup === 'true' : defaultSettings.autoBackup,
      backupRetentionDays: storedSettings.backupRetentionDays ? parseInt(storedSettings.backupRetentionDays) : defaultSettings.backupRetentionDays,
      twoFactorAuth: storedSettings.twoFactorAuth ? storedSettings.twoFactorAuth === 'true' : defaultSettings.twoFactorAuth,
      sessionTimeout: storedSettings.sessionTimeout ? storedSettings.sessionTimeout === 'true' : defaultSettings.sessionTimeout,
      sessionDuration: storedSettings.sessionDuration ? parseInt(storedSettings.sessionDuration) : defaultSettings.sessionDuration
    }
    
    return settings
  } catch (error) {
    console.error('Error loading settings:', error)
    return defaultSettings
  }
}

// Helper function to save settings to SQLite
async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      sqliteHelpers.setSetting(key, value.toString())
    }
  }
}

export async function updateGeneralSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; message: string }> {
  try {
    await saveSettings(settings)
    console.log("Updated general settings:", settings)
    
    revalidatePath("/settings")
    return { success: true, message: "General settings updated successfully" }
  } catch (error: any) {
    console.error('Error updating general settings:', error)
    return { success: false, message: error.message }
  }
}

export async function updateNotificationSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; message: string }> {
  try {
    await saveSettings(settings)
    console.log("Updated notification settings:", settings)
    
    revalidatePath("/settings")
    return { success: true, message: "Notification settings updated successfully" }
  } catch (error: any) {
    console.error('Error updating notification settings:', error)
    return { success: false, message: error.message }
  }
}

export async function updateDatabaseSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; message: string }> {
  try {
    await saveSettings(settings)
    console.log("Updated database settings:", settings)
    
    revalidatePath("/settings")
    return { success: true, message: "Database settings updated successfully" }
  } catch (error: any) {
    console.error('Error updating database settings:', error)
    return { success: false, message: error.message }
  }
}

export async function updateSecuritySettings(settings: Partial<AppSettings>): Promise<{ success: boolean; message: string }> {
  try {
    await saveSettings(settings)
    console.log("Updated security settings:", settings)
    
    revalidatePath("/settings")
    return { success: true, message: "Security settings updated successfully" }
  } catch (error: any) {
    console.error('Error updating security settings:', error)
    return { success: false, message: error.message }
  }
}

export async function resetToDefaults(): Promise<{ success: boolean; message: string }> {
  try {
    // Reset all settings to defaults by saving default values
    await saveSettings(defaultSettings)
    console.log("Reset to default settings")
    
    revalidatePath("/settings")
    return { success: true, message: "Settings reset to defaults successfully" }
  } catch (error: any) {
    console.error('Error resetting settings:', error)
    return { success: false, message: error.message }
  }
}