import dotenv from 'dotenv';
import process from 'node:process';

/**
 * This file is meant to be run from the command line, and is not used by the
 * application server.  It's allowed to use node.js primitives, and only needs
 * to be run once.
 */

dotenv.config({ path: '.dev.vars' });

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;

if (!token) {
  throw new Error('The DISCORD_TOKEN environment variable is required.');
}
if (!applicationId) {
  throw new Error(
    'The DISCORD_APPLICATION_ID environment variable is required.',
  );
}

const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;
const termChoices = [
  {name: "A term 2024", value: "A"},
  {name: "B term 2024", value: "B"},
  {name: "C term 2025", value: "C"},
  {name: "D term 2025", value: "D"},
  {name: "E1 term 2025", value: "E1"},
  {name: "E2 term 2025", value: "E2"}
]
const yearChoices = [
  {name: "2024", value: "2024"},
  {name: "2025", value: "2025"}
]
var year = 2025;
while(year <= new Date().getFullYear()) {
  termChoices.push({name: "A term " + year, value: "A" + year});
  termChoices.push({name: "B term " + year, value: "B" + year});
  year++;
  termChoices.push({name: "C term " + year, value: "C" + year});
  termChoices.push({name: "D term " + year, value: "D" + year});
  termChoices.push({name: "E1 term " + year, value: "E1" + year});
  termChoices.push({name: "E2 term " + year, value: "E2" + year});
  yearChoices.push({name: year.toString(), value: year.toString()})
}
const dormChoices = [
  {name: "Daniels Hall", value: "daniels"},
  {name: "East Hall", value: "east"},
  {name: "Faraday Hall", value: "faraday"},
  {name: "Founders Hall", value: "founders"},
  {name: "Institute Hall", value: "institute"},
  {name: "Messenger Hall", value: "messenger"},
  {name: "Morgan Hall", value: "morgan"},
  {name: "Sanford Riley Hall", value: "sanford-riley"},
  {name: "Stoddard Complex", value: "stoddard"},
  {name: "WPI Townhouses", value: "townhouses"},
  {name: "Ellsworth Apartments", value: "ellsworth"},
  {name: "Fuller Apartments", value: "fuller"},
  {name: "Cedar Houses", value: "cedar"},
  {name: "Elbridge House", value: "elbridge"},
  {name: "Fruit House", value: "fruit"},
  {name: "Hackfeld House", value: "hackfeld"},
  {name: "Marston Houses", value: "marston"},
  {name: "Oak House", value: "oak"},
  {name: "Schussler House", value: "schussler"},
  {name: "Sever House", value: "sever"},
  {name: "Trowbridge House", value: "trowbridge"},
  {name: "Wachusett House", value: "wachusett"},
  {name: "West House", value: "west"},
  {name: "William House", value: "william"},
  {name: "Off Campus", value: "off-campus"},
]

const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${token}`,
  },
  method: 'PUT',
  body: JSON.stringify([
    {
      type: 1,// Slash command
      name: "schedule",
      description: "Generate a visual schedule for a user",
      options: [
        {
          type: 3,// STRING,
          name: "term",
          description: "Term to generate a schedule for (defaults to current term)",
          required: false,
          choices: termChoices
        },
        {
        type: 6,// USER
        name: "user",
        description: "User to make a schedule for (defaults to yourself)",
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "calendar",
      description: "Generates an iCal / ICS file of your schedule",
      options: [
        {
          type: 3,// STRING,
          name: "term",
          description: "Term to generate a calendar for (defaults to all terms)",
          required: false,
          choices: termChoices
        }
      ],
    },
    {
      type: 1,// Slash command
      name: "list",
      description: "List all classes that a user is in",
      options: [
        {
          type: 6,// USER
          name: "user",
          description: "User to list classes for (defaults to yourself)",
          required: false
        },
        {
          type: 3,// STRING,
          name: "term",
          description: "Term to list classes for (defaults to all terms)",
          required: false,
          choices: termChoices
        }
      ]
    },
    {
      type: 1,// Slash command
      name: "addclass",
      description: "Add yourself to a class or sections of a class",
      options: [{
        type: 3,// STRING
        name: "class",
        description: "Class to add yourself to (ex. MA1021)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section1",
        description: "Section of the class to add yourself to (ex. AL01)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section2",
        description: "Additional section of the class to add yourself to (ex. AD02)",
        required: false
      },
      {
        type: 3,// STRING
        name: "section3",
        description: "Additional section of the class to add yourself to (ex. AX02)",
        required: false
      },
      {
        type: 3,// STRING
        name: "year",
        description: "Year of the class sections to add (defaults to current year)",
        choices: yearChoices,
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "removeclass",
      description: "Remove yourself from a class or sections of a class",
      options: [{
        type: 3,// STRING
        name: "class",
        description: "Class to remove yourself from (ex. MA1021)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section1",
        description: "Section of the class to remove yourself from (ex. AL01, defaults to all sections)",
        required: false
      },
      {
        type: 3,// STRING
        name: "section2",
        description: "Additional section of the class to remove yourself from (ex. AD02)",
        required: false
      },
      {
        type: 3,// STRING
        name: "section3",
        description: "Additional section of the class to remove yourself from (ex. AX02)",
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "class",
      description: "Show all users registered in a class or section",
      options: [{
        type: 3,// STRING
        name: "class",
        description: "Class to check registered users of (ex. MA1021)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section",
        description: "Section to check registered users of (ex. AL01, defaults to all sections)",
        required: false
      },
      {
        type: 3,// STRING,
        name: "dorm",
        description: "Dorm building to filter by (optional)",
        required: false,
        choices: dormChoices
      },
      {
        type: 3,// STRING,
        name: "term",
        description: "Term to filter by (defaults to none)",
        required: false,
        choices: termChoices
      },],
    },
    {
      type: 1,// Slash command
      name: "mutuals",
      description: "Show all classes you have in common with a specified user",
      options: [{
        type: 6,// USER
        name: "user",
        description: "User to get classes for",
        required: true
      },
      {
        type: 3,// STRING,
        name: "term",
        description: "Term to show classes for (defaults to all terms)",
        required: false,
        choices: termChoices
      }],
    },
    {
      type: 1,// Slash command,
      name: "import",
      description: "Import your course list from Workday, or show instructions to do so",
      options: [
        {
          type: 11,// ATTACHMENT,
          name: "file",
          description: "File from Workday containing your course list (leave blank for instructions)",
          required: false
        },
        {
          type: 5,// BOOLEAN
          name: "keep",
          description: "When true, existing classes will be kept alongside the import (defaults to false)",
          required: false
        }
      ]
    },
    {
      type: 1,// Slash command
      name: "dorm",
      description: "Show the dorm a user lives in",
      options: [{
        type: 6,// USER
        name: "user",
        description: "User to show the dorm for",
        required: true
      }],
    },
    {
      type: 1,// Slash command
      name: "setdorm",
      description: "Set your dorm",
      options: [{
        type: 3,// STRING,
        name: "dorm",
        description: "Dorm building you are in (leave blank to clear)",
        required: false,
        choices: dormChoices
      },
      {
        type: 3,// STRING,
        name: "room",
        description: "Room you are in within your dorm building (leave blank to clear)",
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "dormlist",
      description: "List all users who live in the specified dorm building",
      options: [{
        type: 3,// STRING,
        name: "dorm",
        description: "Dorm building to list users for",
        required: true,
        choices: dormChoices
      }],
    },
    {
      type: 2,// User context menu
      name: "Schedule"
    },
    {
      type: 2,// User context menu
      name: "Mutual Classes"
    },
    {
      type: 2,// User context menu
      name: "List Classes"
    },
    {
      type: 2,// User context menu
      name: "Show Dorm"
    }
  ]),
});

if (response.ok) {
  console.log('Registered all commands');
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
} else {
  console.error('Error registering commands');
  let errorText = `Error registering commands \n ${response.url}: ${response.status} ${response.statusText}`;
  try {
    const error = await response.text();
    if (error) {
      errorText = `${errorText} \n\n ${error}`;
    }
  } catch (err) {
    console.error('Error reading body from request:', err);
  }
  console.error(errorText);
}
