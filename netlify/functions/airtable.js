// Netlify Function: secure Airtable proxy for Packwise.
// Set an environment variable AIRTABLE_PAT in Netlify (Site settings > Environment variables).
// The personal access token never reaches the browser — the frontend only calls this function.

const PAT = process.env.AIRTABLE_PAT;

// user keys must be our own tokens: letters, digits, _ or -, 6..64 chars.
// This also prevents any formula injection since no quotes/parens are possible.
function safeKey(k) {
  return typeof k === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(k) ? k : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return resp(405, { error: "Method not allowed" });
  }
  if (!PAT) {
    return resp(500, { error: "AIRTABLE_PAT is not set on the Netlify site." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Bad JSON" }); }

  const { base, action, table } = body;
  if (!base) return resp(400, { error: "Missing base id" });

  const apiBase = `https://api.airtable.com/v0/${base}`;
  const headers = { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" };

  try {
    switch (action) {
      case "loadState": {
        const key = safeKey(body.userKey);
        if (!key) return resp(400, { error: "Missing or invalid user key" });
        const url = `${apiBase}/AppState?maxRecords=1&filterByFormula=${encodeURIComponent("{Key}='" + key + "'")}`;
        const r = await fetch(url, { headers });
        return passthrough(r);
      }
      case "saveState": {
        const key = safeKey(body.userKey);
        if (!key) return resp(400, { error: "Missing or invalid user key" });
        const listUrl = `${apiBase}/AppState?maxRecords=1&filterByFormula=${encodeURIComponent("{Key}='" + key + "'")}`;
        const list = await (await fetch(listUrl, { headers })).json();
        const rec = (list.records || [])[0];
        const fields = { Key: key, Data: body.data, UpdatedAt: new Date().toISOString() };
        if (rec) {
          const r = await fetch(`${apiBase}/AppState/${rec.id}`, {
            method: "PATCH", headers, body: JSON.stringify({ fields }),
          });
          return passthrough(r);
        } else {
          const r = await fetch(`${apiBase}/AppState`, {
            method: "POST", headers, body: JSON.stringify({ fields }),
          });
          return passthrough(r);
        }
      }
      case "list": {
        const r = await fetch(`${apiBase}/${encodeURIComponent(table)}?pageSize=100`, { headers });
        return passthrough(r);
      }
      case "create": {
        const r = await fetch(`${apiBase}/${encodeURIComponent(table)}`, {
          method: "POST", headers,
          body: JSON.stringify({ fields: body.fields, typecast: true }),
        });
        return passthrough(r);
      }
      case "update": {
        const r = await fetch(`${apiBase}/${encodeURIComponent(table)}/${body.recordId}`, {
          method: "PATCH", headers,
          body: JSON.stringify({ fields: body.fields, typecast: true }),
        });
        return passthrough(r);
      }
      case "delete": {
        const r = await fetch(`${apiBase}/${encodeURIComponent(table)}/${body.recordId}`, {
          method: "DELETE", headers,
        });
        return passthrough(r);
      }
      case "upload": {
        // Upload an attachment directly from base64 via Airtable's content endpoint.
        const r = await fetch(
          `https://content.airtable.com/v0/${base}/${body.recordId}/${encodeURIComponent(body.field)}/uploadAttachment`,
          {
            method: "POST", headers,
            body: JSON.stringify({
              contentType: body.contentType,
              file: body.b64,
              filename: body.filename,
            }),
          }
        );
        return passthrough(r);
      }
      case "savePacking": {
        // Simple replace-all: list existing rows for this trip, delete, then recreate.
        const list = await (await fetch(`${apiBase}/Packing?pageSize=100`, { headers })).json();
        const existing = (list.records || []).filter(
          (rec) => (rec.fields.TripName || rec.fields.Trip) === body.tripName
        );
        // delete in batches of 10
        for (let i = 0; i < existing.length; i += 10) {
          const ids = existing.slice(i, i + 10).map((r) => `records[]=${r.id}`).join("&");
          await fetch(`${apiBase}/Packing?${ids}`, { method: "DELETE", headers });
        }
        // create in batches of 10
        const rows = (body.items || []).map((p) => ({
          fields: {
            TripName: body.tripName, Text: p.text, Category: p.category,
            Qty: p.qty || null, Packed: !!p.packed, Reason: p.reason || "",
          },
        }));
        for (let i = 0; i < rows.length; i += 10) {
          await fetch(`${apiBase}/Packing`, {
            method: "POST", headers,
            body: JSON.stringify({ records: rows.slice(i, i + 10), typecast: true }),
          });
        }
        return resp(200, { ok: true, saved: rows.length });
      }
      default:
        return resp(400, { error: "Unknown action" });
    }
  } catch (e) {
    return resp(502, { error: String(e) });
  }
};

async function passthrough(r) {
  const text = await r.text();
  return { statusCode: r.status, headers: { "Content-Type": "application/json" }, body: text };
}
function resp(code, obj) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
