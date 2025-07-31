import express from "express";
import { notification } from "./utils.ts";
import { expo, validateExpoPushTokens } from "./expo.ts";

const app = express();
app.use(express.json());

const ticketIds: string[] = [];

app.post("/send-notification", async (req, res) => {
  const expoPushToken = req.body.expoPushToken as string;

  if (!validateExpoPushTokens([expoPushToken])) {
    return res.status(400).json({
      message: "Token inválido",
    });
  }

  const message = {
    to: expoPushToken,
    ...notification,
  };

  const ticket = await expo.sendPushNotificationsAsync([message]);

  if (ticket[0].status === "error") {
    res.status(500).send({
      message: "Internal server error",
    });
    return;
  }

  ticketIds.push(ticket[0].id);

  res.status(200).send({
    id: ticket[0].id,
    message: "Notificação enviada com sucesso",
  });
});

app.post("/send-many-notifications", async (req, res) => {
  const expoPushTokens = req.body.expoPushTokens as string[];

  if (!validateExpoPushTokens(expoPushTokens)) {
    return res.status(400).json({
      message: "Token inválido",
    });
  }

  const messages = expoPushTokens.map((expoPushToken) => {
    return {
      to: expoPushToken,
      ...notification,
    };
  });

  const chunks = expo.chunkPushNotifications(messages);

  const ticketsSuccess = [];
  const ticketsError = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);

      const success = ticketChunk.filter((ticket) => ticket.status === "ok");
      const errors = ticketChunk.filter((ticket) => ticket.status === "error");

      ticketsSuccess.push(...success);
      ticketsError.push(...errors);
    } catch (error) {
      console.error(error);
    }
  }

  ticketIds.push(...ticketsSuccess.map((ticket) => ticket.id));

  res.status(200).send({
    ticketsSuccess,
    ticketsError,
  });
});

app.get("/receipts", async (req, res) => {
  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

  let successReceipts = [];
  let errorReceipts = [];

  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (let receiptId in receipts) {
        let receipt = receipts[receiptId];

        if (receipt.status === "error") {
          errorReceipts.push(receipt);
          continue;
        }

        successReceipts.push(receipt);
      }
    } catch (error) {
      console.error(error);
    }
  }

  res.status(200).send({
    successReceipts,
    errorReceipts,
  });
});

app.listen(3333, () => {
  console.log("Server started on port 3333");
});
