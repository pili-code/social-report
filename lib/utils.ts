import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num)
}

export function formatPercent(num: number): string {
  return num.toFixed(1) + '%'
}

export function getChangeColor(change: string): string {
  if (change.startsWith('+') && change !== '+0.0%' && change !== '+0%') {
    return 'text-green-600'
  }
  if (change.startsWith('-')) {
    return 'text-red-600'
  }
  return 'text-gray-500'
}

export function getChangeBg(change: string): string {
  if (change.startsWith('+') && change !== '+0.0%' && change !== '+0%') {
    return 'bg-green-100'
  }
  if (change.startsWith('-')) {
    return 'bg-red-100'
  }
  return 'bg-gray-100'
}
