package com.musicqueue

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.application.ApplicationStopped
import io.ktor.server.response.*
import io.ktor.server.routing.*

private const val DEFAULT_LIMIT = 20

fun Application.configureRouting() {
    val appId = environment.config.propertyOrNull("ktor.qobuz.appId")?.getString()
        ?: System.getenv("QOBUZ_APP_ID")
        ?: throw IllegalStateException("QOBUZ_APP_ID must be set for Qobuz access.")

    val httpClient = createQobuzHttpClient()
    val qobuzClient = QobuzClient(httpClient, appId)

    environment.monitor.subscribe(ApplicationStopped) {
        httpClient.close()
    }

    routing {
        get("/health") {
            call.respondText("ok")
        }

        get("/search") {
            val query = call.request.queryParameters["q"]
                ?: call.request.queryParameters["query"]
                ?: throw IllegalArgumentException("Missing 'q' query parameter.")

            val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: DEFAULT_LIMIT
            val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0

            val result = qobuzClient.searchTracks(query, offset, limit)
            call.respond(HttpStatusCode.OK, result)
        }
    }
}
