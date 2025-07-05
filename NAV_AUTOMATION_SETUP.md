# Automated NAV Refresh Setup

This document explains how to set up automated NAV refresh for your portfolio tracker.

## Overview

The system now automatically refreshes NAV data for both mutual funds and NPS without requiring manual user intervention.

## Security Setup

### 1. Generate API Key

Generate a secure API key (32+ characters) for authentication:

```bash
# Generate a random API key
openssl rand -base64 32
```

### 2. Set Environment Variables

Add the following environment variable to your Vercel project:

```
NAV_REFRESH_API_KEY=your_generated_api_key_here
```

**Vercel Setup:**
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `NAV_REFRESH_API_KEY` with your generated key
4. Deploy to apply the changes

## Cron Job Configuration

The `vercel.json` file configures automated refresh:

- **Mutual Funds**: Weekdays at 6:00 PM IST (`0 18 * * 1-5`)
- **NPS**: Mondays at 7:00 PM IST (`0 19 * * 1`)

## Monitoring

### Admin Dashboard

Access the NAV monitor at: `/admin/nav-monitor`

This dashboard shows:
- Mutual fund NAV status (up to date/needs update)
- Last update timestamps for both MF and NPS
- Automated refresh schedule information

### Vercel Function Logs

Monitor execution in Vercel dashboard:
1. Go to your project in Vercel
2. Navigate to Functions tab
3. Check logs for `/api/refresh-nav` and `/api/refresh-nps-nav`

## Manual Testing

Test the endpoints manually (for admin use only):

```bash
# Test mutual fund refresh
curl -X POST https://your-domain.vercel.app/api/refresh-nav \
  -H "x-api-key: your_api_key_here"

# Test NPS refresh  
curl -X POST https://your-domain.vercel.app/api/refresh-nps-nav \
  -H "x-api-key: your_api_key_here"
```

## Security Notes

- API key is required for all NAV refresh operations
- No user authentication needed for automated refresh
- Service role key used for database access
- Error messages don't expose internal system details

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check API key in environment variables
2. **500 Internal Server Error**: Check Supabase service role key
3. **External API failures**: AMFI or npsnav.in may be temporarily unavailable

### Manual Override

If automated refresh fails, you can temporarily restore manual buttons by:
1. Reverting the API changes
2. Adding back the RefreshNavButton components
3. Removing the cron job configuration

## Next Steps

1. Deploy the changes to Vercel
2. Set the environment variable
3. Test the endpoints manually
4. Monitor the first automated runs
5. Remove manual refresh buttons from UI (optional) 