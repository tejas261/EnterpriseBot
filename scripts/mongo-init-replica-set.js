// Runs inside the mongo container after the server is healthy.
// Host "localhost:27017" keeps the advertised primary reachable from the host machine.
try {
  rs.status();
  print("replica set already initiated");
} catch (error) {
  print("initiating replica set rs0");
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] });
}

for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    if (rs.status().myState === 1) {
      print("replica set rs0 is PRIMARY");
      quit(0);
    }
  } catch (error) {
    // still starting
  }
  sleep(1000);
}

print("replica set did not become primary in time");
quit(1);
